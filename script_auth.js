// Este script simularia o login do Google. Em um ambiente real, você usaria o Google Identity Services.
// Por simplicidade e para o contexto do Colab, apenas um redirecionamento é feito.

document.querySelectorAll('.google-login-button').forEach(button => {
    button.addEventListener('click', () => {
        // Em um ambiente real, aqui seria a integração com a API de Login do Google
        // e um redirecionamento para o gerador de imagens após o sucesso do login.
        alert('Simulando Login/Registro com Google. Redirecionando para o gerador de imagens...');
        window.location.href = 'image_generator.html';
    });
});
