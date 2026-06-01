import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black mb-6">Termos de Uso</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          Ao utilizar a plataforma MEU OVO, você concorda com os seguintes termos e condições.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Para Clientes</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          O MEU OVO é uma plataforma de conexão entre clientes e restaurantes. O pedido é enviado diretamente ao restaurante via WhatsApp, e a responsabilidade pela entrega é do estabelecimento.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Para Restaurantes</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          O cadastro é gratuito e sem taxa por pedido. O restaurante é responsável pelo gerenciamento dos pedidos recebidos e pela execução dos serviços.
        </p>
      </main>
      <Footer />
    </div>
  );
}
