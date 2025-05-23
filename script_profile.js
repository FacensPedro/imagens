// Este script lida com a interface do usuário do perfil e o aviso de alterações não salvas.

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email'); // Campo de email
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const profilePicLarge = document.querySelector('.profile-pic-large');
    const displayName = document.getElementById('display-name');
    const messageDiv = document.getElementById('message');
    const unsavedChangesAlert = document.getElementById('unsaved-changes-alert');
    const saveAndProceedBtn = document.getElementById('save-and-proceed-btn');
    const discardAndProceedBtn = document.getElementById('discard-and-proceed-btn');
    const backToGeneratorBtn = document.getElementById('back-to-generator');

    let hasUnsavedChanges = false;
    let originalProfileData = {};
    let targetPage = '';
    let initialLoadComplete = false;

    // Função para mostrar mensagens de status
    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    // Carregar dados do perfil do backend
    async function loadProfileData() {
        try {
            const response = await fetch('/api/profile');
            if (response.ok) {
                const userData = await response.json();
                nameInput.value = userData.name;
                emailInput.value = userData.email; // Preencher o campo de email
                displayName.textContent = userData.name;

                // CORREÇÃO: Usar o profile_pic_path retornado pelo backend (que já pode ser a URL do Google)
                if (userData.profile_pic_path) {
                    // Se for um caminho local, monta o URL completo, senão usa a URL do Google diretamente
                    const imageUrl = userData.profile_pic_path.startsWith('http') ?
                                     userData.profile_pic_path :
                                     `/profile_pics/${userData.profile_pic_path}`;
                    profilePicLarge.style.backgroundImage = `url('${imageUrl}?t=${new Date().getTime()}')`;
                } else {
                    profilePicLarge.style.backgroundImage = `url('default_profile.png')`;
                }

                originalProfileData = {
                    name: userData.name,
                    profile_pic_path: userData.profile_pic_path || 'default_profile.png'
                };
                hasUnsavedChanges = false;
                initialLoadComplete = true;
            } else {
                const errorData = await response.json();
                showMessage(errorData.error || 'Erro ao carregar dados do perfil.', 'error');
                if (response.status === 401) {
                    setTimeout(() => window.location.href = 'login.html', 1500);
                }
            }
        } catch (error) {
            console.error('Erro na requisição de perfil:', error);
            showMessage('Erro de comunicação com o servidor ao carregar perfil.', 'error');
        }
    }
    loadProfileData();

    // Função para verificar se há alterações
    function checkForChanges() {
        if (!initialLoadComplete) return false;

        const currentName = nameInput.value.trim();
        const newPasswordEntered = passwordInput.value !== '';
        const newConfirmPasswordEntered = confirmPasswordInput.value !== '';
        const newProfilePicSelected = profileImageUpload.files.length > 0;

        const nameChanged = currentName !== originalProfileData.name;
        const passwordChanged = newPasswordEntered || newConfirmPasswordEntered;
        
        return nameChanged || passwordChanged || newProfilePicSelected;
    }

    // Monitorar alterações nos campos
    profileForm.addEventListener('input', () => {
        hasUnsavedChanges = checkForChanges();
    });

    // CORREÇÃO: Mostrar a imagem selecionada na hora
    profileImageUpload.addEventListener('change', function() {
        if (initialLoadComplete) {
            hasUnsavedChanges = checkForChanges();
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePicLarge.style.backgroundImage = `url('${e.target.result}')`; // Mostra a imagem selecionada
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // Submissão do formulário de perfil
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newName = nameInput.value.trim();
        const newPassword = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword && newPassword !== confirmPassword) {
            showMessage('As senhas não coincidem!', 'error');
            return;
        }

        const formData = new FormData();
        if (newName !== originalProfileData.name) {
            formData.append('name', newName);
        }
        if (newPassword) {
            formData.append('password', newPassword);
        }
        if (profileImageUpload.files.length > 0) {
            formData.append('profile_pic', profileImageUpload.files[0]);
        }
        
        if (formData.entries().next().done && !profileImageUpload.files.length) {
             showMessage('Nenhuma alteração a ser salva.', 'success');
             hasUnsavedChanges = false;
             if (targetPage) {
                 window.location.href = targetPage;
                 targetPage = '';
             }
             return;
        }

        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userProfilePic', data.user.profile_pic_path || 'default_profile.png');
                displayName.textContent = data.user.name;
                
                // CORREÇÃO: Atualizar a imagem do perfil imediatamente após o salvar
                if (data.user.profile_pic_path) {
                    const imageUrl = data.user.profile_pic_path.startsWith('http') ?
                                     data.user.profile_pic_path :
                                     `/profile_pics/${data.user.profile_pic_path}`;
                    profilePicLarge.style.backgroundImage = `url('${imageUrl}?t=${new Date().getTime()}')`;
                }
                passwordInput.value = '';
                confirmPasswordInput.value = '';
                hasUnsavedChanges = false;
                originalProfileData = {
                    name: data.user.name,
                    profile_pic_path: data.user.profile_pic_path || 'default_profile.png'
                };

                if (targetPage) {
                    window.location.href = targetPage;
                    targetPage = '';
                }

            } else {
                showMessage(data.error || 'Erro ao atualizar perfil.', 'error');
            }
        } catch (error) {
            console.error('Erro na requisição de atualização de perfil:', error);
            showMessage('Erro de comunicação com o servidor ao atualizar perfil.', 'error');
        }
    });

    // Lógica para aviso de alterações não salvas ao tentar navegar
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.href.startsWith(window.location.origin) && !this.href.includes('#')) {
                handleNavigation(e, this.href);
            }
        });
    });

    function handleNavigation(event, targetUrl) {
        if (checkForChanges()) {
            event.preventDefault();
            targetPage = targetUrl;
            unsavedChangesAlert.classList.remove('hidden');
            return false;
        }
        return true;
    }

    window.addEventListener('beforeunload', (e) => {
        if (checkForChanges()) {
            e.returnValue = 'Você tem alterações não salvas. Deseja sair sem salvar?';
        }
    });

    saveAndProceedBtn.addEventListener('click', () => {
        unsavedChangesAlert.classList.add('hidden');
        profileForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    discardAndProceedBtn.addEventListener('click', () => {
        unsavedChangesAlert.classList.add('hidden');
        hasUnsavedChanges = false;
        if (targetPage) {
            window.location.href = targetPage;
            targetPage = '';
        }
    });
});
