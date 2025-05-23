// Este script lida com a funcionalidade da UI, faz chamadas para o backend Flask
// e lida com o estado da sessão do usuário.

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const generateButton = document.getElementById('generate-button');
    const imageDisplay = document.getElementById('image-display');
    const loadingMessage = document.querySelector('.loading-message');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const modelLinks = document.querySelectorAll('.dropdown-menu a');
    const profileArea = document.querySelector('.profile-area');
    const profileMenu = document.querySelector('.profile-menu');
    const profilePic = document.querySelector('.profile-pic');
    const logoutButton = document.getElementById('logout-button');
    const initialMessageElement = document.querySelector('.initial-message'); // Seleciona a mensagem inicial


    let currentModel = 'google-studio'; // Modelo padrão

    async function checkUserStatus() {
        try {
            const response = await fetch('/api/user_status');
            const data = await response.json();
            if (data.logged_in) {
                // Nome do usuário não é mais exibido na página de geração
                // profileToggle.textContent = data.user.name; // LINHA REMOVIDA
                const userProfilePicPath = data.user.profile_pic_path;
                if (userProfilePicPath && userProfilePicPath.startsWith('http')) {
                    profilePic.style.backgroundImage = `url('${userProfilePicPath}')`;
                } else if (userProfilePicPath) {
                    profilePic.style.backgroundImage = `url('/profile_pics/${userProfilePicPath}?t=${new Date().getTime()}')`;
                } else {
                    profilePic.style.backgroundImage = `url('default_profile.png')`;
                }
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Erro ao verificar status do usuário:', error);
            window.location.href = 'login.html';
        }
    }
    checkUserStatus();

    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            generateImage();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            this.value += '\n';
        }
    });

    generateButton.addEventListener('click', generateImage);

    async function generateImage() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            alert('Por favor, digite um prompt para gerar a imagem.');
            return;
        }

        if (initialMessageElement) {
            initialMessageElement.remove();
        }
        imageDisplay.innerHTML = '';
        loadingMessage.style.display = 'block';

        try {
            const response = await fetch('/generate_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: prompt, model: currentModel })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao gerar imagem no servidor.');
            }

            const data = await response.json();
            const imageUrl = data.image_url;

            if (imageUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = `Imagem gerada para "${prompt.replace(/"/g, '&quot;')}"`;

                imgElement.onerror = () => {
                    console.error('Falha ao carregar a imagem gerada (URL:' + imageUrl + '). Tentando fallback local.');
                    imgElement.src = 'local_placeholder.png';
                    imgElement.alt = 'Imagem gerada (fallback)';
                    imgElement.onerror = null;
                };

                imageDisplay.appendChild(imgElement);
                imageDisplay.style.justifyContent = 'flex-start';
                imageDisplay.style.alignItems = 'flex-start';
            } else {
                imageDisplay.innerHTML = '<p>Nenhuma imagem retornada ou URL inválida.</p>';
            }

        } catch (error) {
            console.error('Erro na geração de imagem:', error);
            imageDisplay.innerHTML = `<p style="color: red;">Erro: ${error.message || 'Falha na geração de imagem.'}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    dropdownToggle.addEventListener('click', function() {
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    modelLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            currentModel = this.dataset.model;
            dropdownToggle.textContent = this.textContent;
            dropdownMenu.style.display = 'none';
            console.log(`Modelo selecionado: ${currentModel}`);
        });
    });

    // Removido o listener de window.addEventListener('click') para fechar o menu de modelo
    // Ele será fechado ao clicar no botão novamente ou ao selecionar um modelo.

    profilePic.addEventListener('click', function(event) {
        event.stopPropagation();
        profileArea.classList.toggle('active'); // Controla a visibilidade do menu
    });

    // Fechar dropdown de perfil se clicar fora da área do perfil
    window.addEventListener('click', function(e) {
        if (!profileArea.contains(e.target)) {
            profileArea.classList.remove('active');
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                if (response.ok) {
                    alert('Você foi desconectado. Redirecionando para a página inicial.');
                    window.location.href = 'index.html';
                } else {
                    alert('Erro ao fazer logout.');
                }
            } catch (error) {
                console.error('Erro no logout:', error);
                alert('Erro de comunicação com o servidor durante o logout.');
            }
        });
    } else {
        console.warn("Botão de logout não encontrado. O listener não foi adicionado.");
    }
});
