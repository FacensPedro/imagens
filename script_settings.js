// Este script lida com a interface do usuário de configurações.
// A funcionalidade de salvar configurações persistentes exigiria um backend real.

document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.querySelector('.settings-container form');
    const languageSelect = document.getElementById('language');
    const themeSelect = document.getElementById('theme');
    const notificationsCheckbox = document.getElementById('notifications');
    const messageDiv = document.getElementById('message');

    // Simulação de carregamento de configurações
    function loadSettings() {
        languageSelect.value = localStorage.getItem('settingLanguage') || 'pt-br';
        themeSelect.value = localStorage.getItem('settingTheme') || 'dark';
        notificationsCheckbox.checked = localStorage.getItem('settingNotifications') === 'true' ? true : false;
    }

    loadSettings();

    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Simulação de salvamento de configurações
        localStorage.setItem('settingLanguage', languageSelect.value);
        localStorage.setItem('settingTheme', themeSelect.value);
        localStorage.setItem('settingNotifications', notificationsCheckbox.checked);

        showMessage('Configurações salvas com sucesso!', 'success');
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
