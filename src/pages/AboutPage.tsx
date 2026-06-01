import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black mb-6">Sobre o MEU OVO</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          O MEU OVO é uma plataforma que conecta restaurantes locais a clientes, com taxa zero para o restaurante e um programa de fidelidade que recompensa o cliente.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          Acreditamos que a tecnologia pode fortalecer a relação entre restaurantes e seus clientes, sem intermediários abusivos.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Cada pedido gera estrelas para o cliente, que podem ser trocadas por benefícios. O restaurante recebe o pedido diretamente no WhatsApp e gerencia do seu jeito.
        </p>
      </main>
      <Footer />
    </div>
  );
}
