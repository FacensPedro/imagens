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
    const initialMessageElement = document.getElementById('initial-message');
    const errorMessageElement = document.getElementById('error-message');

    let currentModel = 'imagen-3.0-generate-002'; // Modelo padrão para geração de imagem

    // Função para verificar o status do usuário e atualizar a UI
    async function checkUserStatus() {
        try {
            const response = await fetch('/api/user_status');
            const data = await response.json();
            if (data.logged_in) {
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
        const userPrompt = promptInput.value.trim(); // Renomeado para userPrompt
        if (!userPrompt) {
            errorMessageElement.textContent = 'Por favor, digite um prompt para gerar a imagem.';
            errorMessageElement.style.display = 'block';
            return;
        }

        // Logs para depuração no frontend
        console.log("Prompt do usuário digitado (userPrompt):", userPrompt);
        console.log("Modelo selecionado (currentModel):", currentModel);
        // O detailedPrompt será construído no backend (ou não, dependendo da sua escolha lá)
        console.log("Corpo da requisição JSON a ser enviado:", JSON.stringify({ userPrompt: userPrompt, model: currentModel }));


        if (initialMessageElement) {
            initialMessageElement.style.display = 'none';
        }
        imageDisplay.innerHTML = '';
        errorMessageElement.style.display = 'none';
        loadingMessage.style.display = 'block';

        try {
            const response = await fetch('/generate_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // MUDANÇA: Enviar 'userPrompt' para o backend
                body: JSON.stringify({ userPrompt: userPrompt, model: currentModel })
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
                imgElement.alt = `Imagem gerada para "${userPrompt.replace(/"/g, '&quot;')}"`;

                imgElement.onerror = () => {
                    console.error('Falha ao carregar a imagem gerada. URL:', imageUrl);
                    errorMessageElement.textContent = 'A imagem gerada não pôde ser carregada. Tente novamente ou use outro prompt.';
                    errorMessageElement.style.display = 'block';
                    imgElement.remove();
                };

                imgElement.onload = () => {
                    console.log('Imagem carregada com sucesso:', imageUrl);
                    imageDisplay.style.justifyContent = 'center';
                    imageDisplay.style.alignItems = 'center';
                };

                imageDisplay.appendChild(imgElement);

            } else {
                errorMessageElement.textContent = 'Nenhuma imagem retornada ou URL inválida pela API.';
                errorMessageElement.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro na geração de imagem:', error);
            errorMessageElement.textContent = `Erro: ${error.message || 'Falha na geração de imagem.'}`;
            errorMessageElement.style.display = 'block';
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
            if (this.dataset.model === 'google-studio') {
                currentModel = 'imagen-3.0-generate-002';
            } else {
                currentModel = null;
                alert('Este modelo ainda não está disponível para geração de imagens.');
            }
            dropdownToggle.textContent = this.textContent;
            dropdownMenu.style.display = 'none';
            console.log(`Modelo selecionado: ${this.textContent} (API Model: ${currentModel || 'N/A'})`);
        });
    });

    window.addEventListener('click', function(e) {
        if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
        if (!profileArea.contains(e.target)) {
            profileArea.classList.remove('active');
        }
    });

    profilePic.addEventListener('click', function(event) {
        event.stopPropagation();
        profileArea.classList.toggle('active');
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
