// Este script lida com a interface do usuário do perfil e o aviso de alterações não salvas.

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
    const unsavedChangesAlert = document.getElementById('unsaved-changes-alert');
    const saveAndProceedBtn = document.getElementById('save-and-proceed-btn');
    const discardAndProceedBtn = document.getElementById('discard-and-proceed-btn');
    const backToGeneratorBtn = document.getElementById('back-to-generator');

    let hasUnsavedChanges = false;
    let originalProfileData = {};
    let targetPage = '';
    let initialLoadComplete = false;

    function showMessage(msg, type) {
        if (messageDiv) {
            messageDiv.textContent = msg;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        } else {
            console.warn("Elemento 'message' não encontrado para exibir mensagem:", msg);
        }
    }

    async function loadProfileData() {
        try {
            const response = await fetch('/api/profile');
            if (response.ok) {
                const userData = await response.json();
                if (nameInput) nameInput.value = userData.name;
                if (emailInput) emailInput.value = userData.email;
                if (displayName) displayName.textContent = userData.name;

                if (profilePicLarge) {
                    if (userData.profile_pic_path) {
                        const imageUrl = userData.profile_pic_path.startsWith('http') ?
                                         userData.profile_pic_path :
                                         `/profile_pics/${userData.profile_pic_path}`;
                        profilePicLarge.style.backgroundImage = `url('${imageUrl}?t=${new Date().getTime()}')`;
                    } else {
                        profilePicLarge.style.backgroundImage = `url('default_profile.png')`;
                    }
                } else {
                    console.warn("Elemento 'profilePicLarge' não encontrado. Imagem de perfil não será atualizada.");
                }

                originalProfileData = {
                    name: userData.name,
                    profile_pic_path: userData.profile_pic_path || 'default_profile.png'
                };
                hasUnsavedChanges = false;
                initialLoadComplete = true;
            } else {
                let errorMsg = `Erro ${response.status}: ${response.statusText}.`;
                try {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const errorData = await response.json();
                        errorMsg = errorData.error || `Erro ao carregar dados do perfil (${response.status}).`;
                    } else {
                        const textError = await response.text();
                        console.warn("Resposta de erro não-JSON do servidor (GET " + response.status + "):", textError.substring(0, 500));
                        errorMsg = `Erro ao carregar perfil (${response.status}). O servidor não retornou dados válidos.`;
                    }
                } catch (e) {
                    console.error('Falha ao processar corpo da resposta de erro (GET):', e);
                    errorMsg = `Erro ao carregar perfil (${response.status}). Falha ao ler a resposta do servidor.`;
                }
                showMessage(errorMsg, 'error');
                if (response.status === 401) {
                    setTimeout(() => window.location.href = 'login.html', 1500);
                }
            }
        } catch (error) {
            console.error('Erro na requisição de perfil (GET):', error);
            showMessage('Erro de comunicação com o servidor ao carregar perfil.', 'error');
        }
    }
    loadProfileData();

    function checkForChanges() {
        if (!initialLoadComplete) return false;

        const currentName = nameInput ? nameInput.value.trim() : '';
        const newPasswordEntered = passwordInput ? passwordInput.value !== '' : false;
        const newConfirmPasswordEntered = confirmPasswordInput ? confirmPasswordInput.value !== '' : false;
        const newProfilePicSelected = profileImageUpload ? profileImageUpload.files.length > 0 : false;

        const nameChanged = currentName !== originalProfileData.name;
        const passwordChanged = newPasswordEntered || newConfirmPasswordEntered;
        
        return nameChanged || passwordChanged || newProfilePicSelected;
    }

    if (profileForm) {
        profileForm.addEventListener('input', () => {
            hasUnsavedChanges = checkForChanges();
        });
    }

    if (profileImageUpload) {
        profileImageUpload.addEventListener('change', function() {
            hasUnsavedChanges = checkForChanges();
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (profilePicLarge) {
                        profilePicLarge.style.backgroundImage = `url('${e.target.result}')`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileForm) {
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
            if (nameInput && newName !== originalProfileData.name) {
                formData.append('name', newName);
            }
            if (passwordInput && newPassword) {
                formData.append('password', newPassword);
            }
            if (profileImageUpload && profileImageUpload.files.length > 0) {
                formData.append('profile_pic', profileImageUpload.files[0]);
            }
            
            let hasDataToSubmit = false;
            for (let pair of formData.entries()) { 
                hasDataToSubmit = true; 
                break; 
            }

            if (!hasDataToSubmit) {
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

                let data;
                const contentType = response.headers.get("content-type");

                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const textResponse = await response.text();
                    console.warn(`Resposta não-JSON do servidor (POST ${response.status}):`, textResponse.substring(0, 500));
                    if (!response.ok) {
                        data = { error: `Erro ${response.status}: ${response.statusText}. O servidor não retornou JSON.` };
                    } else {
                        data = { message: `Resposta inesperada do servidor (status ${response.status}, não JSON).` };
                    }
                }

                if (response.ok) {
                    showMessage(data.message || 'Perfil atualizado com sucesso!', 'success');
                    if (data.user) {
                        if (localStorage) {
                            localStorage.setItem('userName', data.user.name);
                            localStorage.setItem('userEmail', data.user.email); 
                            localStorage.setItem('userProfilePic', data.user.profile_pic_path || 'default_profile.png');
                        }
                        if (displayName) displayName.textContent = data.user.name;
                        
                        if (profilePicLarge && data.user.profile_pic_path) {
                            const imageUrl = data.user.profile_pic_path.startsWith('http') ?
                                             data.user.profile_pic_path :
                                             `/profile_pics/${data.user.profile_pic_path}`;
                            profilePicLarge.style.backgroundImage = `url('${imageUrl}?t=${new Date().getTime()}')`;
                        }
                        originalProfileData = {
                            name: data.user.name,
                            profile_pic_path: data.user.profile_pic_path || 'default_profile.png'
                        };
                    }
                    if (passwordInput) passwordInput.value = '';
                    if (confirmPasswordInput) confirmPasswordInput.value = '';
                    hasUnsavedChanges = false;
                    
                    if (targetPage) {
                        window.location.href = targetPage;
                        targetPage = '';
                    }
                } else {
                    showMessage(data.error || `Erro ao atualizar perfil (${response.status}).`, 'error');
                }
            } catch (error) {
                console.error('Erro na requisição de atualização de perfil (POST):', error);
                let errorMsg = 'Erro de comunicação com o servidor ao atualizar perfil.';
                if (error instanceof SyntaxError) {
                    errorMsg = 'Erro ao processar resposta do servidor (POST). Formato inesperado.';
                }
                showMessage(errorMsg, 'error');
            }
        });
    }

    if (backToGeneratorBtn) {
        backToGeneratorBtn.addEventListener('click', function(e) {
            if (this.href && this.href.startsWith(window.location.origin) && !this.href.includes('#')) {
                handleNavigation(e, this.href);
            }
        });
    }

    document.querySelectorAll('a').forEach(link => {
        if (link && link.href && link.href.startsWith(window.location.origin) && !link.href.includes('#') && link !== backToGeneratorBtn) {
            link.addEventListener('click', function(e) {
                handleNavigation(e, this.href);
            });
        }
    });


    function handleNavigation(event, targetUrl) {
        if (checkForChanges()) {
            event.preventDefault();
            targetPage = targetUrl;
            if (unsavedChangesAlert) unsavedChangesAlert.classList.remove('hidden');
            return false;
        }
        return true;
    }

    window.addEventListener('beforeunload', (e) => {
        if (checkForChanges()) {
            e.preventDefault(); 
            e.returnValue = 'Você tem alterações não salvas. Deseja sair sem salvar?';
        }
    });

    if (saveAndProceedBtn) {
        saveAndProceedBtn.addEventListener('click', () => {
            if (unsavedChangesAlert) unsavedChangesAlert.classList.add('hidden');
            if (profileForm) profileForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
    }

    if (discardAndProceedBtn) {
        discardAndProceedBtn.addEventListener('click', () => {
            if (unsavedChangesAlert) unsavedChangesAlert.classList.add('hidden');
            hasUnsavedChanges = false; 
            if (targetPage) {
                window.location.href = targetPage;
                targetPage = '';
            }
        });
    }
});
