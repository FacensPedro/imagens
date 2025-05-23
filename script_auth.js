// Este script lida com a autenticação de login e registro, incluindo o Google Identity Services.

// Função jwt_decode EMBUTIDA para garantir disponibilidade
function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
};

function showAuthMessage(message, type) {
    const authMessageDiv = document.getElementById('auth-message');
    if (authMessageDiv) {
        authMessageDiv.textContent = message;
        authMessageDiv.className = `message ${type}`;
        authMessageDiv.style.display = 'block';
        setTimeout(() => {
            authMessageDiv.style.display = 'none';
        }, 5000);
    }
}

// Handler para resposta do Google Identity Services (chamado automaticamente pelo SDK)
async function handleCredentialResponse(response) {
    const id_token = response.credential;
    const authMessageDiv = document.getElementById('auth-message');
    if (authMessageDiv) authMessageDiv.style.display = 'block';
    if (authMessageDiv) authMessageDiv.textContent = 'Processando login com Google...';
    if (authMessageDiv) authMessageDiv.className = 'message';


    try {
        const decoded_data = jwt_decode(id_token);
        console.log('Dados do Google decodificados:', decoded_data);

        const apiEndpoint = window.location.pathname.includes('register.html') ? '/api/register' : '/api/login';

        const backendResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: decoded_data.name,
                email: decoded_data.email,
                google_id: decoded_data.sub,
                picture_url: decoded_data.picture, // ENVIANDO A URL DA FOTO DO GOOGLE PARA O BACKEND
                id_token: id_token
            })
        });

        const data = await backendResponse.json();

        if (backendResponse.ok) {
            showAuthMessage(data.message, 'success');
            localStorage.setItem('userName', data.user.name || decoded_data.name);
            localStorage.setItem('userEmail', data.user.email || decoded_data.email);
            // Armazena o profile_pic_path completo, que pode ser a URL do Google ou caminho local
            localStorage.setItem('userProfilePic', data.user.profile_pic_path || decoded_data.picture || 'default_profile.png');
            setTimeout(() => {
                window.location.href = 'image_generator.html';
            }, 1000);
        } else {
            showAuthMessage(data.error || 'Erro no login com Google.', 'error');
        }

    } catch (error) {
        console.error('Erro ao processar login com Google:', error);
        showAuthMessage('Erro inesperado ao processar login com Google.', 'error');
    }
}

// Funções para lidar com formulários de login/registro manual
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            showAuthMessage('A fazer login...', '');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    showAuthMessage(data.message, 'success');
                    localStorage.setItem('userName', data.user.name);
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userProfilePic', data.user.profile_pic_path || 'default_profile.png');
                    setTimeout(() => {
                        window.location.href = 'image_generator.html';
                    }, 1000);
                } else {
                    showAuthMessage(data.error || 'Erro no login.', 'error');
                }
            } catch (error) {
                console.error('Erro na requisição de login:', error);
                showAuthMessage('Erro de comunicação com o servidor.', 'error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            showAuthMessage('A registar...', '');

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    showAuthMessage(data.message, 'success');
                    localStorage.setItem('userName', data.user.name);
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userProfilePic', data.user.profile_pic_path || 'default_profile.png');
                    setTimeout(() => {
                        window.location.href = 'image_generator.html';
                    }, 1000);
                } else {
                    showAuthMessage(data.error || 'Erro no registro.', 'error');
                }
            } catch (error) {
                console.error('Erro na requisição de registro:', error);
                showAuthMessage('Erro de comunicação com o servidor.', 'error');
            }
        });
    }
});
