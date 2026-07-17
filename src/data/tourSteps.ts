import { TourStep } from '../components/OvinhoTour';

export const customerTourSteps: TourStep[] = [
  {
    title: 'Bem-vindo ao MEU OVO!',
    content: 'Oi! Eu sou o Ovinho, seu guia por aqui. Vou te mostrar como pedir comida dos melhores restaurantes do seu bairro em poucos minutos.',
    placement: 'center',
  },
  {
    target: '[data-ovinho="search"]',
    title: 'Busque por Restaurantes',
    content: 'Digite o nome de um restaurante, tipo de culinária ou até um prato específico. O MEU OVO encontra tudo pra você!',
    placement: 'bottom',
  },
  {
    target: '[data-ovinho="categories"]',
    title: 'Filtros Rápidos',
    content: 'Use esses filtros para encontrar exatamente o que você está procurando. Pizza, sushi, hambúrguer — é só escolher!',
    placement: 'bottom',
  },
  {
    target: '[data-ovinho="restaurants"]',
    title: 'Restaurantes',
    content: 'Aqui estão os restaurantes perto de você. Cada um tem avaliação, tempo estimado e preço. Toque em um para ver o cardápio completo!',
    placement: 'top',
  },
  {
    target: '[data-ovinho="restaurant-card"]',
    title: 'Faça seu Pedido!',
    content: 'Depois de escolher, monte seu carrinho, finalize o pedido e acompanhe tudo em tempo real. Bora pedir? 🍳',
    placement: 'bottom',
  },
];

export const restaurantTourSteps: TourStep[] = [
  {
    title: 'Bem-vindo ao Painel do Restaurante!',
    content: 'E aí, parceiro! 🥚 Me chamo Ovinho e vou te guiar para cadastrar seu restaurante na plataforma. Vamos nessa?',
    placement: 'center',
  },
  {
    target: '[data-ovinho="restaurant-name"]',
    title: 'Nome do Restaurante',
    content: 'Primeiro, preencha o nome do seu restaurante, endereço e horários. Use seu CEP que a gente busca o endereço automático!',
    placement: 'bottom',
  },
  {
    title: 'Categorias do Cardápio',
    content: 'Depois de preencher os dados, clique em "Continuar". Na próxima tela você vai criar categorias como "Pizzas", "Bebidas", "Sobremesas". É rapidinho!',
    placement: 'center',
  },
  {
    title: 'Seus Produtos',
    content: 'Hora de cadastrar os produtos! Nome, preço e categoria. Dá pra importar o cardápio inteiro tirando uma foto — inteligente, né?',
    placement: 'center',
  },
  {
    title: 'Configurar Delivery',
    content: 'Na parte de entrega, defina a taxa, tempo estimado e raio de entrega. Tudo configurado direitinho pra não ter surpresa.',
    placement: 'center',
  },
  {
    title: 'Tudo Pronto!',
    content: 'Seu restaurante está cadastrado! Agora é só acessar o painel administrativo e começar a receber pedidos. Qualquer dúvida, é só me chamar! 🍳🎉',
    placement: 'center',
  },
];

export const adminTourSteps: TourStep[] = [
  {
    title: 'Painel Administrativo',
    content: 'Aqui é o centro de comando do seu restaurante! Pedidos, cardápio, relatórios, tudo num lugar só.',
    placement: 'center',
  },
  {
    target: '[data-ovinho="admin-orders"]',
    title: 'Pedidos',
    content: 'Aqui chegam todos os pedidos. Você pode aceitar, preparar e entregar — tudo em tempo real.',
    placement: 'left',
  },
  {
    target: '[data-ovinho="admin-menu"]',
    title: 'Gerenciar Cardápio',
    content: 'Precisa alterar um preço ou adicionar um prato novo? É aqui que você mexe no cardápio.',
    placement: 'right',
  },
  {
    target: '[data-ovinho="admin-analytics"]',
    title: 'Relatórios e Métricas',
    content: 'Veja suas vendas, pratos mais pedidos e tudo que precisa pra crescer. Dados são o novo ouro! 🥚',
    placement: 'top',
  },
];
