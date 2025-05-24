import os
import threading
import time
import sqlite3
import base64
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, session, url_for
from flask_cors import CORS
from pyngrok import ngrok
from google.colab import userdata
import google.generativeai as genai
from werkzeug.security import generate_password_hash, check_password_hash
import urllib.parse
from functools import wraps

FLASK_PORT = int(os.environ.get('FLASK_PORT', 5050))
NGROK_DOMAIN = os.environ.get('NGROK_DOMAIN')
DATABASE_FILE = 'users.db'
PROFILE_PICS_DIR = 'profile_pics'

STATIC_FOLDER = '/content/imagens'

app = Flask(__name__, static_folder=STATIC_FOLDER)

FLASK_SECRET_KEY_FROM_COLAB = userdata.get('FLASK_SECRET_KEY')
if not FLASK_SECRET_KEY_FROM_COLAB:
    raise ValueError("A variável 'FLASK_SECRET_KEY' não está configurada nas Secrets do Colab.")
app.secret_key = FLASK_SECRET_KEY_FROM_COLAB

app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

GOOGLE_CLIENT_ID_FRONTEND = userdata.get('GOOGLE_CLIENT_ID_FRONTEND')
if not GOOGLE_CLIENT_ID_FRONTEND:
    print('AVISO: GOOGLE_CLIENT_ID_FRONTEND não encontrado nas Secrets do Colab.')

GOOGLE_API_KEY = userdata.get('GOOGLE_API_KEY')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print('AVISO: GOOGLE_API_KEY não encontrada nas Secrets do Colab. A geração de imagens com a API real não funcionará.')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            profile_pic_path TEXT,
            google_id TEXT UNIQUE
        )
    ''')
    conn.commit()
    conn.close()

def setup_profile_pics_dir():
    if not os.path.exists(PROFILE_PICS_DIR):
        os.makedirs(PROFILE_PICS_DIR)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Não autenticado.'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    google_id = data.get('google_id')
    google_picture_url = data.get('picture_url')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if google_id:
            user_by_google = cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
            if user_by_google:
                session['user_id'] = user_by_google['id']
                session.permanent = True
                return jsonify({'message': 'Login Google bem-sucedido!', 'user': dict(user_by_google)}), 200

            user_by_email = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if user_by_email:
                if user_by_email['google_id'] is None:
                    cursor.execute("UPDATE users SET google_id = ?, profile_pic_path = ? WHERE email = ?", (google_id, google_picture_url, email))
                    conn.commit()
                    user_by_email = conn.execute("SELECT id, name, email, profile_pic_path FROM users WHERE id = ?", (user_by_email['id'],)).fetchone()
                    session['user_id'] = user_by_email['id']
                    session.permanent = True
                    return jsonify({'message': 'Conta Google vinculada com sucesso!', 'user': dict(user_by_email)}), 200
                else:
                    return jsonify({'error': 'Este email já está vinculado a outra conta Google.'}), 409
            else:
                cursor.execute("INSERT INTO users (name, email, google_id, profile_pic_path) VALUES (?, ?, ?, ?)", (name, email, google_id, google_picture_url))
                conn.commit()
                user_id = cursor.lastrowid
                session['user_id'] = user_id
                session.permanent = True
                return jsonify({'message': 'Usuário Google registrado com sucesso!', 'user': {'id': user_id, 'name': name, 'email': email, 'profile_pic_path': google_picture_url}}), 201

        else:
            if not name or not email or not password:
                return jsonify({'error': 'Nome, email e senha são obrigatórios.'}), 400

            user_by_email = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if user_by_email:
                if user_by_email['google_id'] is not None:
                    return jsonify({'error': 'Este email já está registrado com uma conta Google. Faça login com Google.'}), 409
                else:
                    return jsonify({'error': 'Este email já está registrado manualmente. Faça login.'}), 409

            password_hash = generate_password_hash(password)
            cursor.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", (name, email, password_hash))
            conn.commit()
            user_id = cursor.lastrowid
            session['user_id'] = user_id
            session.permanent = True
            return jsonify({'message': 'Usuário registrado com sucesso!', 'user': {'id': user_id, 'name': name, 'email': email}}), 201

    except sqlite3.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': f'Erro de integridade no DB: {e}'}), 409
    except Exception:
        conn.rollback()
        return jsonify({'error': 'Ocorreu um erro inesperado no registro.'}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    google_id = data.get('google_id')
    google_picture_url = data.get('picture_url')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if google_id:
            user = cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
            if user:
                session['user_id'] = user['id']
                session.permanent = True
                if google_picture_url and user['profile_pic_path'] != google_picture_url:
                    cursor.execute("UPDATE users SET profile_pic_path = ? WHERE id = ?", (google_picture_url, user['id']))
                    conn.commit()
                    user = conn.execute("SELECT * FROM users WHERE id = ?", (user['id'],)).fetchone()
                return jsonify({'message': 'Login Google bem-sucedido!', 'user': dict(user)}), 200
            else:
                return jsonify({'error': 'Conta Google não registrada.'}), 401
        else:
            if not email or not password:
                return jsonify({'error': 'Email e senha obrigatórios.'}), 400

            user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
                session['user_id'] = user['id']
                session.permanent = True
                return jsonify({'message': 'Login bem-sucedido!', 'user': dict(user)}), 200
            else:
                return jsonify({'error': 'Email ou senha inválidos.'}), 401
    except Exception:
        return jsonify({'error': 'Ocorreu um erro inesperado no login.'}), 500
    finally:
        conn.close()

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logout bem-sucedido!'}), 200

@app.route('/api/user_status', methods=['GET'])
def user_status():
    current_user_id = session.get('user_id')
    if current_user_id:
        conn = get_db_connection()
        user = conn.execute("SELECT id, name, email, profile_pic_path FROM users WHERE id = ?", (current_user_id,)).fetchone()
        conn.close()
        if user:
            user_data = dict(user)
            if user_data['profile_pic_path'] and not user_data['profile_pic_path'].startswith(('http://', 'https://')):
                user_data['profile_pic_url'] = url_for('uploaded_file', filename=os.path.basename(user_data['profile_pic_path']), _external=True)
            else:
                user_data['profile_pic_url'] = user_data['profile_pic_path']
            del user_data['profile_pic_path']
            return jsonify({'logged_in': True, 'user': user_data}), 200
    return jsonify({'logged_in': False}), 200

@app.route('/api/profile', methods=['GET', 'POST'])
@login_required
def profile():
    conn = get_db_connection()
    user_id = session['user_id']

    try:
        if request.method == 'GET':
            user = conn.execute("SELECT id, name, email, profile_pic_path FROM users WHERE id = ?", (user_id,)).fetchone()
            if user:
                user_data = dict(user)
                if user_data['profile_pic_path'] and not user_data['profile_pic_path'].startswith(('http://', 'https://')):
                    user_data['profile_pic_url'] = url_for('uploaded_file', filename=os.path.basename(user_data['profile_pic_path']), _external=True)
                else:
                    user_data['profile_pic_url'] = user_data['profile_pic_path']
                del user_data['profile_pic_path']
                return jsonify(user_data), 200
            return jsonify({'error': 'Usuário não encontrado.'}), 404

        elif request.method == 'POST':
            user_current_data = conn.execute("SELECT profile_pic_path FROM users WHERE id = ?", (user_id,)).fetchone()
            old_profile_pic_path = user_current_data['profile_pic_path'] if user_current_data else None

            name = request.form.get('name')
            password = request.form.get('password')
            profile_pic_file = request.files.get('profile_pic')

            update_query = "UPDATE users SET "
            params = []
            updates = []

            if name:
                updates.append("name = ?")
                params.append(name)
            if password:
                password_hash = generate_password_hash(password)
                updates.append("password_hash = ?")
                params.append(password_hash)

            if profile_pic_file:
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
                filename_ext = profile_pic_file.filename.rsplit('.', 1)[1].lower() if '.' in profile_pic_file.filename else ''
                if filename_ext not in allowed_extensions:
                    return jsonify({'error': 'Tipo de arquivo de imagem não permitido.'}), 400

                timestamp = int(datetime.now().timestamp())
                filename = f"{user_id}_{timestamp}.{filename_ext}"
                filepath = os.path.join(PROFILE_PICS_DIR, filename)

                profile_pic_file.save(filepath)

                updates.append("profile_pic_path = ?")
                params.append(filepath)

                if old_profile_pic_path and os.path.exists(old_profile_pic_path) and not old_profile_pic_path.startswith(('http://', 'https://')):
                    os.remove(old_profile_pic_path)

            if not updates:
                return jsonify({'message': 'Nenhuma alteração enviada.'}), 200

            update_query += ", ".join(updates) + " WHERE id = ?"
            params.append(user_id)

            conn.execute(update_query, tuple(params))
            conn.commit()
            updated_user = conn.execute("SELECT id, name, email, profile_pic_path FROM users WHERE id = ?", (user_id,)).fetchone()
            updated_user_data = dict(updated_user)
            if updated_user_data['profile_pic_path'] and not updated_user_data['profile_pic_path'].startswith(('http://', 'https://')):
                updated_user_data['profile_pic_url'] = url_for('uploaded_file', filename=os.path.basename(updated_user_data['profile_pic_path']), _external=True)
            else:
                updated_user_data['profile_pic_url'] = updated_user_data['profile_pic_path']
            del updated_user_data['profile_pic_path']

            return jsonify({'message': 'Perfil atualizado com sucesso!', 'user': updated_user_data}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar perfil: {str(e)}'}), 500
    finally:
        conn.close()

@app.route(f'/{PROFILE_PICS_DIR}/<filename>')
def uploaded_file(filename):
    return send_from_directory(PROFILE_PICS_DIR, filename)

@app.route('/generate_image', methods=['POST'])
def generate_image_endpoint():
    data = request.get_json()
    prompt = data.get('prompt')
    model_name = data.get('model', 'gemini-1.5-flash-latest')

    if not prompt:
        return jsonify({'error': 'Prompt não fornecido.'}), 400

    if not GOOGLE_API_KEY:
        return jsonify({'error': 'API Key do Google não configurada no backend.'}), 500

    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)

        image_url_to_frontend = None
        if response and response.candidates:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'image') and part.image:
                            if hasattr(part.image, 'uri') and part.image.uri:
                                image_url_to_frontend = part.image.uri
                            elif hasattr(part.image, 'data') and part.image.data:
                                image_url_to_frontend = f"data:image/jpeg;base64,{base64.b64encode(part.image.data).decode('utf-8')}"
                            break
                        elif hasattr(part, 'text') and part.text:
                            image_url_to_frontend = f"https://via.placeholder.com/400x300?text=Modelo+Retornou+Texto:{urllib.parse.quote_plus(part.text[:30])}"
                            break
                if image_url_to_frontend:
                    break

        if image_url_to_frontend:
            return jsonify({'image_url': image_url_to_frontend}), 200
        else:
            return jsonify({'error': 'A API não retornou uma imagem/texto válido. Verifique o modelo e o prompt.'}), 500

    except Exception as e:
        return jsonify({'error': f'Falha ao gerar imagem: {str(e)}. Verifique se você está usando um modelo de text-to-image e configurou a API corretamente.'}), 500

@app.route('/')
def serve_index():
    return send_from_directory(STATIC_FOLDER, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_FOLDER, filename)

def run_flask_app():
    app.run(port=FLASK_PORT, host='0.0.0.0', debug=False, threaded=True)

if __name__ == '__main__':
    init_db()
    setup_profile_pics_dir()

    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()

    time.sleep(5)

    try:
        ngrok_auth_token = userdata.get('NGROK_AUTH_TOKEN')
        if ngrok_auth_token:
            ngrok.set_auth_token(ngrok_auth_token)
        else:
            raise ValueError("A variável de ambiente 'NGROK_AUTH_TOKEN' não está configurada nas Secrets do Colab.")

        if NGROK_DOMAIN:
            public_url = ngrok.connect(FLASK_PORT, proto='http', hostname=NGROK_DOMAIN)
        else:
            public_url = ngrok.connect(FLASK_PORT, proto='http')

        print(f'Sua aplicação está acessível em: {public_url}')
        print('Mantenha esta célula em execução para manter o túnel Ngrok ativo. Para parar, interrompa a execução da célula.')
    except Exception as e:
        print(f'ERRO ao iniciar o túnel Ngrok: {e}')
        ngrok.kill()
        os._exit(1)

    while True:
        time.sleep(1)
