// Este script demonstra a funcionalidade da UI e simula a chamada à API.
// A integração real com a API do Google Studio (Generative AI API) exigiria um backend Python
// para lidar com a chave da API com segurança.

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const generateButton = document.getElementById('generate-button');
    const imageDisplay = document.getElementById('image-display');
    const loadingMessage = document.querySelector('.loading-message');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const modelLinks = document.querySelectorAll('.dropdown-menu a');
    const profileToggle = document.querySelector('.profile-toggle');
    const profileMenu = document.querySelector('.profile-menu');
    const profilePic = document.querySelector('.profile-pic');
    const logoutButton = document.querySelector('.logout-button');

    let currentModel = 'google-studio'; // Modelo padrão

    // Funcionalidade do campo de digitação
    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            generateImage();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            // Pular linha
            this.value += '\n';
        }
    });

    generateButton.addEventListener('click', generateImage);

    function generateImage() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            alert('Por favor, digite um prompt para gerar a imagem.');
            return;
        }

        imageDisplay.innerHTML = ''; // Limpa resultados anteriores
        loadingMessage.style.display = 'block'; // Mostra mensagem de carregamento

        // Simula a chamada à API do Google Studio
        // Em um cenário real, você faria uma requisição para o seu backend Python aqui.
        // O backend então chamaria a API do Google Generative AI.
        console.log(`Gerando imagem com o modelo: ${currentModel} para o prompt: "${prompt}"`);

        setTimeout(() => {
            loadingMessage.style.display = 'none'; // Esconde mensagem de carregamento
            // Simula a URL de uma imagem gerada
            const imageUrl = `https://via.placeholder.com/400x300?text=Imagem+Gerada+por+${currentModel.replace('-', '+')}`;
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.alt = `Imagem gerada para "${prompt}"`;
            imageDisplay.appendChild(imgElement);
            imageDisplay.style.justifyContent = 'flex-start';
            imageDisplay.style.alignItems = 'flex-start';
        }, 2000); // Simula um atraso de 2 segundos para a geração
    }

    // Funcionalidade do dropdown de modelos
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
            // Aqui você pode adicionar lógica para configurar o modelo da API
            // se houver diferentes endpoints ou configurações para cada modelo.
        });
    });

    // Fechar dropdown de modelos se clicar fora
    window.addEventListener('click', function(e) {
        if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    // Funcionalidade do dropdown de perfil
    profilePic.addEventListener('click', function() {
        profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    profileToggle.addEventListener('click', function() {
        profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    logoutButton.addEventListener('click', () => {
        alert('Simulando logout. Redirecionando para a página inicial.');
        window.location.href = 'index.html';
    });

    // Fechar dropdown de perfil se clicar fora
    window.addEventListener('click', function(e) {
        if (!profileToggle.contains(e.target) && !profileMenu.contains(e.target) && !profilePic.contains(e.target)) {
            profileMenu.style.display = 'none';
        }
    });

    // Simulação de dados do perfil (em um ambiente real, viria do backend)
    function loadProfileData() {
        const userName = localStorage.getItem('userName') || 'Nome do Usuário';
        const userProfilePic = localStorage.getItem('userProfilePic') || 'default_profile.png';
        document.querySelector('.profile-toggle').textContent = userName;
        document.querySelector('.profile-pic').style.backgroundImage = `url('${userProfilePic}')`;
    }

    loadProfileData(); // Carrega dados do perfil ao iniciar
});
