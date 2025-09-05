import React from 'react';

interface LandingPageProps {
  onGoToLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const carouselImages = [
    'https://iudoo.com.br/wp-content/uploads/2025/09/10.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/09.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/08.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/07.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/06.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/05.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/04.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/03.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/02.png',
    'https://iudoo.com.br/wp-content/uploads/2025/09/01.png',
  ];
  
  // Duplicate images for seamless scroll effect
  const allCarouselImages = [...carouselImages, ...carouselImages];

  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <img src="https://iudoo.com.br/wp-content/uploads/2025/09/Logo-Stoodio.png" alt="Stoodio Logo" className="h-8" />
          <button 
            onClick={onGoToLogin} 
            className="px-6 py-2 font-semibold text-gray-800 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            Fazer Login
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-gray-50 pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full mb-4">
                  <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Powered by • iudoo Agencia IA
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                  O estúdio criativo<br/>
                  <span className="text-yellow-500">automatizado</span>
                </h1>
                <p className="mt-6 text-lg text-gray-600 max-w-lg mx-auto md:mx-0">
                  Chega de perder tempo com design. Com o Stoodio, você envia a foto do produto, escreve o texto e nossa IA gera artes prontas e consistentes no estilo da sua marca.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button onClick={onGoToLogin} className="px-8 py-3 font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-transform transform hover:scale-105 flex items-center justify-center">
                    Teste Grátis
                    <svg className="w-5 h-5 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                  <button onClick={onGoToLogin} className="px-8 py-3 font-semibold text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-transform transform hover:scale-105">
                    Fazer Login
                  </button>
                </div>
              </div>
              <div className="relative mt-12 md:mt-0">
                <img 
                  src="https://iudoo.com.br/wp-content/uploads/2025/09/banner-Site.png" 
                  alt="Stoodio Dashboard Showcase"
                  className="w-full h-auto animate-float"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Image Carousel Section */}
        <section className="py-12 bg-white">
          <div className="relative w-full overflow-hidden">
            <div className="flex animate-scroll">
              {allCarouselImages.map((src, index) => (
                <div key={index} className="flex-shrink-0 w-64 mx-4">
                  <img src={src} alt={`Generated image example ${index + 1}`} className="w-full h-auto rounded-lg shadow-lg" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section - Restyled */}
        <section className="py-20 bg-gray-50">
          <div className="container px-6 mx-auto text-center">
            <h3 className="text-4xl font-bold">Como Funciona</h3>
            <p className="mt-2 text-lg text-gray-600">Um processo simples para resultados profissionais.</p>
            <div className="grid gap-12 mt-16 md:grid-cols-3">
              <div className="p-8">
                <div className="flex items-center justify-center w-16 h-16 mx-auto text-3xl font-bold text-white bg-gray-900 rounded-full">1</div>
                <h4 className="mt-6 text-2xl font-semibold">Faça o Upload</h4>
                <p className="mt-2 text-gray-600">Envie as imagens dos seus produtos com facilidade. Fundos transparentes funcionam melhor!</p>
              </div>
              <div className="p-8">
                 <div className="flex items-center justify-center w-16 h-16 mx-auto text-3xl font-bold text-white bg-gray-900 rounded-full">2</div>
                <h4 className="mt-6 text-2xl font-semibold">Descreva sua Ideia</h4>
                <p className="mt-2 text-gray-600">Use nosso Co-Piloto de IA e snippets de inspiração para construir o prompt perfeito.</p>
              </div>
              <div className="p-8">
                 <div className="flex items-center justify-center w-16 h-16 mx-auto text-3xl font-bold text-white bg-gray-900 rounded-full">3</div>
                <h4 className="mt-6 text-2xl font-semibold">Gere e Baixe</h4>
                <p className="mt-2 text-gray-600">Veja a mágica acontecer. A IA cria sua imagem em segundos. Baixe e use onde quiser.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Restyled */}
      <footer className="py-8 text-gray-400 bg-gray-900">
        <div className="container mx-auto text-center">
           <img src="https://iudoo.com.br/wp-content/uploads/2025/09/Logo-Stoodio.png" alt="Stoodio Logo" className="h-8 mx-auto mb-4 grayscale invert" />
          <p>&copy; {new Date().getFullYear()} Stoodio. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;