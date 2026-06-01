import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black mb-6">Política de Privacidade</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          Sua privacidade é importante para nós. Esta política descreve como coletamos, usamos e protegemos suas informações.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Dados Coletados</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Coletamos apenas as informações necessárias para o funcionamento da plataforma: nome, telefone e endereço de entrega.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Uso dos Dados</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Seus dados são usados exclusivamente para processar pedidos e melhorar a experiência na plataforma. Não compartilhamos suas informações com terceiros sem seu consentimento.
        </p>
      </main>
      <Footer />
    </div>
  );
}
