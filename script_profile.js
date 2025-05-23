// Este script lida com a interface do usuário do perfil.
// A funcionalidade de salvar dados do perfil (nome, senha, imagem) exigiria um backend real.

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const profilePicLarge = document.querySelector('.profile-pic-large');
    const displayName = document.getElementById('display-name');
    const messageDiv = document.getElementById('message');

    function loadProfileData() {
        const storedName = localStorage.getItem('userName') || 'Nome do Usuário';
        const storedEmail = localStorage.getItem('userEmail') || 'usuario@example.com';
        const storedProfilePic = localStorage.getItem('userProfilePic') || 'default_profile.png';

        nameInput.value = storedName;
        emailInput.value = storedEmail;
        displayName.textContent = storedName;
        profilePicLarge.style.backgroundImage = `url('${storedProfilePic}')`;
    }

    loadProfileData();

    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newName = nameInput.value.trim();
        const newPassword = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword && newPassword !== confirmPassword) {
            showMessage('As senhas não coincidem!', 'error');
            return;
        }

        localStorage.setItem('userName', newName);
        displayName.textContent = newName;

        showMessage('Perfil atualizado com sucesso!', 'success');
        passwordInput.value = '';
        confirmPasswordInput.value = '';
    });

    profileImageUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicLarge.style.backgroundImage = `url('${e.target.result}')`;
                localStorage.setItem('userProfilePic', e.target.result);
                showMessage('Imagem de perfil atualizada!', 'success');
            };
            reader.readAsDataURL(file);
        }
    });

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
});
