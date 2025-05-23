function handleCredentialResponse(response) {
    // Decodifica o token de ID JWT (JSON Web Token)
    const data = jwt_decode(response.credential);
    
    // Em um ambiente real, você enviaria este 'response.credential' para o seu backend
    // para verificação e criação de sessão de usuário segura.
    console.log("ID: " + data.sub);
    console.log('Nome Completo: ' + data.name);
    console.log('Dado de Perfil: ' + data.picture);
    console.log('Email: ' + data.email);

    // Simulação de armazenamento de dados do perfil para uso no frontend
    localStorage.setItem('userName', data.name);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userProfilePic', data.picture);

    alert('Login/Registro com Google realizado com sucesso! Redirecionando para o gerador de imagens...');
    window.location.href = 'image_generator.html';
}

// Incluir a biblioteca jwt-decode para decodificar o token de ID no cliente (apenas para demonstração)
// Em um ambiente de produção, a decodificação e verificação do token devem ser feitas no backend.
// Você precisará adicionar <script src="https://unpkg.com/jwt-decode/build/jwt-decode.js"></script>
// no seu HTML, ou incluir o conteúdo desta biblioteca no seu script_auth.js se não for usá-la externamente.
// Para fins de teste no Colab, pode-se incluir uma versão simplificada ou o link externo.

// A linha abaixo é para fins de teste no Colab/desenvolvimento.
// Para um ambiente de produção, a validação do token deve ser no servidor.
function jwt_decode(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};
