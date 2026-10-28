const STORAGE_KEY = 'dreamcraft_demo_data_v1';
const DEMO_PASSWORD = 'dream123';
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('dc_user') || 'null');
  } catch (error) {
    console.error('Could not read the local demo user:', error);
    return null;
  }
};

const makeInitialStore = () => {
  const customer = {
    id: 'demo-customer',
    name: 'Aarav Sharma',
    email: 'customer@dreamcraft.demo',
    role: 'customer',
    phone: '+919876543210',
    avatar_url: '',
    bio: 'Loves handmade Indian crafts and thoughtful design.',
    location: 'Jaipur, Rajasthan',
    created_at: now(),
  };
  const artisan = {
    id: 'demo-artisan',
    name: 'Meera Patel',
    email: 'artisan@dreamcraft.demo',
    role: 'artisan',
    phone: '+919876543211',
    avatar_url: '',
    bio: 'Third-generation textile artist specializing in handwoven silk.',
    location: 'Varanasi, Uttar Pradesh',
    created_at: now(),
    specializations: ['Sarees', 'Clothing', 'Handicrafts'],
    skills: ['Weaving', 'Embroidery', 'Dyeing'],
    experience_years: 12,
    price_range_min: 1500,
    price_range_max: 18000,
    is_available: true,
    rating: 4.9,
    total_orders: 36,
    portfolio_description: 'Handwoven heirloom textiles made with care.',
    portfolio: [],
  };
  const otherArtisans = [
    {
      id: 'demo-artisan-jewelry',
      name: 'Rohan Verma',
      email: 'rohan@dreamcraft.demo',
      role: 'artisan',
      avatar_url: '',
      location: 'Jaipur, Rajasthan',
      bio: 'Handcrafted silver and gemstone jewellery.',
      specializations: ['Jewellery', 'Accessories'],
      skills: ['Goldsmithing', 'Beadwork'],
      experience_years: 9,
      price_range_min: 800,
      price_range_max: 25000,
      is_available: true,
      rating: 4.8,
      total_orders: 24,
      portfolio_description: 'Small-batch jewellery inspired by heritage motifs.',
      portfolio: [],
    },
    {
      id: 'demo-artisan-pottery',
      name: 'Sana Khan',
      email: 'sana@dreamcraft.demo',
      role: 'artisan',
      avatar_url: '',
      location: 'Khurja, Uttar Pradesh',
      bio: 'Ceramic artist making colorful functional pottery.',
      specializations: ['Pottery', 'Home Decor'],
      skills: ['Pottery', 'Painting'],
      experience_years: 7,
      price_range_min: 500,
      price_range_max: 9000,
      is_available: true,
      rating: 4.7,
      total_orders: 18,
      portfolio_description: 'Playful ceramics for everyday rituals.',
      portfolio: [],
    },
  ];
  const design1 = {
    id: 'demo-design-quote',
    customer_id: customer.id,
    title: 'Festive handwoven silk saree',
    description: 'A lightweight silk saree with a deep teal body and small gold floral details for a family celebration.',
    category: 'Sarees',
    budget_min: 5000,
    budget_max: 12000,
    colors: ['Blue', 'Gold'],
    materials: ['Silk'],
    style: 'Traditional',
    pattern: 'Small floral zari',
    reference_images: [],
    status: 'open',
    created_at: now(),
    updated_at: now(),
  };
  const design2 = {
    id: 'demo-design-open',
    customer_id: customer.id,
    title: 'Hand-painted tea set',
    description: 'A set of four ceramic cups with a bright marigold and leaf motif.',
    category: 'Pottery',
    budget_min: 1500,
    budget_max: 4000,
    colors: ['Yellow', 'Green'],
    materials: ['Clay'],
    style: 'Fusion',
    pattern: 'Marigold',
    reference_images: [],
    status: 'open',
    created_at: now(),
    updated_at: now(),
  };
  const conversation = {
    id: 'demo-conversation',
    customer_id: customer.id,
    artisan_id: artisan.id,
    order_id: null,
    created_at: now(),
  };

  return {
    users: [customer, artisan, ...otherArtisans],
    designs: [design1, design2],
    quotations: [{
      id: 'demo-quotation',
      design_request_id: design1.id,
      artisan_id: artisan.id,
      customer_id: customer.id,
      amount: 8500,
      estimated_days: 18,
      notes: 'Includes handwoven silk, zari border, and gift packaging.',
      status: 'pending',
      created_at: now(),
      updated_at: now(),
    }],
    orders: [],
    conversations: [conversation],
    messages: [{
      id: 'demo-message',
      conversation_id: conversation.id,
      sender_id: artisan.id,
      sender_name: artisan.name,
      content: 'Hello! I would love to help bring your design to life. Do you have a preferred delivery date?',
      media_url: null,
      media_type: null,
      is_read: false,
      created_at: now(),
    }],
    notifications: [
      {
        id: 'demo-notification-1',
        user_id: customer.id,
        type: 'quotation',
        title: 'New Quotation Received',
        message: 'Meera Patel sent a quote for your festive silk saree.',
        is_read: false,
        reference_id: 'demo-quotation',
        reference_type: 'quotation',
        created_at: now(),
      },
    ],
    aiConversations: [],
    aiMessages: [],
  };
};

const readStore = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = makeInitialStore();
    writeStore(initial);
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Local demo data is invalid:', error);
    throw new Error('Demo data could not be read. Clear this site’s local storage to restart the demo.');
  }
};

const writeStore = (store) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Could not save local demo data:', error);
    const message = 'Browser storage is full. Remove large uploads or clear the demo data and try again.';
    const storageError = new Error(message);
    storageError.response = { status: 507, data: { error: message } };
    throw storageError;
  }
};

const updateStore = (update) => {
  const store = readStore();
  const result = update(store);
  writeStore(store);
  return result;
};

const response = (data, status = 200) => ({ data, status });
const fail = (status, message) => {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
};
const findUser = (store, userId) => store.users.find((item) => String(item.id) === String(userId));
const requireUser = () => {
  const user = currentUser();
  if (!user) fail(401, 'Sign in to continue');
  return user;
};
const profileFor = (store, user) => {
  const account = findUser(store, user.id);
  return account ? { ...account } : { ...user };
};
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  if (file.size > 750 * 1024) {
    reject(new Error('For this browser-only demo, each upload must be 750 KB or smaller.'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Could not read the selected file'));
  reader.readAsDataURL(file);
});
const serializeFiles = async (form, key) => {
  const files = form.getAll(key);
  return Promise.all(files.map(async (file) => ({
    url: await fileToDataUrl(file),
    filename: file.name,
    mimetype: file.type,
  })));
};
const enrichDesign = (store, design) => ({
  ...design,
  quotation_count: store.quotations.filter((quote) => quote.design_request_id === design.id).length,
  generated_images: [],
});
const enrichArtisan = (user) => ({
  ...user,
  portfolio_preview: (user.portfolio || []).slice(0, 3),
});
const detailsForOrder = (store, order) => {
  const design = store.designs.find((item) => item.id === order.design_request_id);
  const customer = findUser(store, order.customer_id);
  const artisan = findUser(store, order.artisan_id);
  const conversation = store.conversations.find((item) => item.order_id === order.id);
  return {
    ...order,
    customer_name: customer?.name,
    customer_avatar: customer?.avatar_url,
    artisan_name: artisan?.name,
    artisan_avatar: artisan?.avatar_url,
    design_title: design?.title,
    design_description: design?.description,
    category: design?.category,
    reference_images: design?.reference_images || [],
    colors: design?.colors || [],
    materials: design?.materials || [],
    conversation_id: conversation?.id,
    production_updates: order.production_updates || [],
  };
};
const notify = (store, userId, title, message, referenceId, referenceType) => {
  store.notifications.unshift({
    id: id('notification'),
    user_id: userId,
    type: referenceType,
    title,
    message,
    is_read: false,
    reference_id: referenceId,
    reference_type: referenceType,
    created_at: now(),
  });
};

const get = (path) => {
  const store = readStore();
  const user = currentUser();
  const url = new URL(path, 'http://demo.local');
  const pathname = url.pathname.replace(/^\/api/, '');

  if (pathname === '/auth/me') {
    if (!user) fail(401, 'Sign in to continue');
    return response(profileFor(store, user));
  }
  if (pathname === '/designs') {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.designs.filter((design) => design.customer_id === user.id).map((design) => enrichDesign(store, design)));
  }
  if (pathname === '/designs/explore') {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    let designs = store.designs.filter((design) => design.status === 'open');
    const category = url.searchParams.get('category');
    if (category) designs = designs.filter((design) => design.category === category);
    return response(designs.map((design) => ({
      ...design,
      customer_name: findUser(store, design.customer_id)?.name,
      customer_avatar: findUser(store, design.customer_id)?.avatar_url,
    })));
  }
  if (pathname === '/quotations') {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.quotations
      .filter((quote) => user.role === 'artisan' ? quote.artisan_id === user.id : quote.customer_id === user.id)
      .map((quote) => {
        const design = store.designs.find((item) => item.id === quote.design_request_id);
        const artisan = findUser(store, quote.artisan_id);
        const order = store.orders.find((item) => item.quotation_id === quote.id);
        return {
          ...quote,
          artisan_name: artisan?.name,
          artisan_avatar: artisan?.avatar_url,
          design_title: design?.title,
          category: design?.category,
          order_id: order?.id,
          order_status: order?.status,
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  if (pathname === '/orders') {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.orders
      .filter((order) => user.role === 'artisan' ? order.artisan_id === user.id : order.customer_id === user.id)
      .map((order) => detailsForOrder(store, order))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  if (pathname === '/notifications') {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.notifications.filter((item) => item.user_id === user.id));
  }
  if (pathname === '/chat/conversations') {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.conversations
      .filter((conv) => user.role === 'artisan' ? conv.artisan_id === user.id : conv.customer_id === user.id)
      .map((conv) => {
        const customer = findUser(store, conv.customer_id);
        const artisan = findUser(store, conv.artisan_id);
        const order = store.orders.find((item) => item.id === conv.order_id);
        const design = order && store.designs.find((item) => item.id === order.design_request_id);
        const messages = store.messages.filter((message) => message.conversation_id === conv.id);
        const last = messages[messages.length - 1];
        return {
          ...conv,
          customer_name: customer?.name,
          customer_avatar: customer?.avatar_url,
          artisan_name: artisan?.name,
          artisan_avatar: artisan?.avatar_url,
          order_status: order?.status,
          latest_order_id: order?.id,
          latest_order_status: order?.status,
          latest_order_title: design?.title,
          last_message: last?.content || (last?.media_type ? `${last.media_type} attachment` : null),
          last_message_at: last?.created_at,
          unread_count: messages.filter((message) => !message.is_read && message.sender_id !== user.id).length,
        };
      })
      .sort((a, b) => (b.last_message_at || b.created_at).localeCompare(a.last_message_at || a.created_at)));
  }
  if (pathname === '/ai/conversations') {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.aiConversations.filter((conv) => conv.user_id === user.id));
  }
  const conversationMessages = pathname.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
  if (conversationMessages) {
    if (!user) fail(401, 'Sign in to continue');
    const conversation = store.conversations.find((conv) => conv.id === conversationMessages[1]);
    if (!conversation || ![conversation.customer_id, conversation.artisan_id].includes(user.id))
      fail(403, 'Conversation access denied');
    const messages = store.messages.filter((message) => message.conversation_id === conversation.id);
    updateStore((data) => {
      data.messages.forEach((message) => {
        if (message.conversation_id === conversation.id && message.sender_id !== user.id) message.is_read = true;
      });
    });
    return response(messages);
  }
  const aiMessages = pathname.match(/^\/ai\/conversations\/([^/]+)\/messages$/);
  if (aiMessages) {
    if (!user) fail(401, 'Sign in to continue');
    return response(store.aiMessages.filter((message) => message.conversation_id === aiMessages[1]));
  }
  const orderDetail = pathname.match(/^\/orders\/([^/]+)$/);
  if (orderDetail) {
    if (!user) fail(401, 'Sign in to continue');
    const order = store.orders.find((item) => item.id === orderDetail[1]);
    if (!order || ![order.customer_id, order.artisan_id].includes(user.id)) fail(404, 'Order not found');
    return response(detailsForOrder(store, order));
  }
  const artisanDetail = pathname.match(/^\/artisans\/([^/]+)$/);
  if (artisanDetail) {
    const artisan = store.users.find((item) => item.id === artisanDetail[1] && item.role === 'artisan');
    if (!artisan) fail(404, 'Artisan not found');
    return response(enrichArtisan(artisan));
  }
  if (pathname === '/artisans') {
    let artisans = store.users.filter((item) => item.role === 'artisan').map(enrichArtisan);
    const params = url.searchParams;
    if (params.get('available') === 'true') artisans = artisans.filter((item) => item.is_available);
    if (params.get('category')) artisans = artisans.filter((item) => item.specializations?.includes(params.get('category')));
    if (params.get('skill')) artisans = artisans.filter((item) => item.skills?.includes(params.get('skill')));
    return response(artisans);
  }
  const designDetail = pathname.match(/^\/designs\/([^/]+)$/);
  if (designDetail) {
    const design = store.designs.find((item) => item.id === designDetail[1]);
    if (!design) fail(404, 'Design not found');
    return response({
      ...enrichDesign(store, design),
      customer_name: findUser(store, design.customer_id)?.name,
      quotations: store.quotations.filter((quote) => quote.design_request_id === design.id),
    });
  }
  const aiConversation = pathname.match(/^\/ai\/conversations\/([^/]+)$/);
  if (aiConversation && !pathname.endsWith('/messages')) {
    const conversation = store.aiConversations.find((item) => item.id === aiConversation[1] && item.user_id === user?.id);
    if (!conversation) fail(404, 'Conversation not found');
    return response(conversation);
  }
  fail(404, `Demo page endpoint not found: ${pathname}`);
};

const post = async (path, body = {}) => {
  const store = readStore();
  const user = currentUser();
  const url = new URL(path, 'http://demo.local');
  const pathname = url.pathname.replace(/^\/api/, '');

  if (pathname === '/auth/login') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !body.password) fail(400, 'Enter your email and password');
    const account = store.users.find((item) => item.email?.toLowerCase() === email);
    if (!account) fail(401, 'No account with that email exists in this browser demo');
    if ([ 'customer@dreamcraft.demo', 'artisan@dreamcraft.demo' ].includes(email) && body.password !== DEMO_PASSWORD)
      fail(401, 'Demo password is dream123');
    return response({ token: `demo-${account.id}`, user: account });
  }
  if (pathname === '/auth/register') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!body.name || !email || !body.password || !body.phone) fail(400, 'Complete all required fields');
    if (store.users.some((item) => item.email?.toLowerCase() === email)) fail(409, 'Email is already registered in this browser demo');
    const account = {
      id: id('user'),
      name: body.name.trim(),
      email,
      role: body.role === 'artisan' ? 'artisan' : 'customer',
      phone: body.phone,
      avatar_url: '',
      bio: '',
      location: '',
      created_at: now(),
      specializations: [],
      skills: [],
      experience_years: 0,
      price_range_min: null,
      price_range_max: null,
      is_available: true,
      rating: 0,
      total_orders: 0,
      portfolio_description: '',
      portfolio: [],
    };
    updateStore((data) => data.users.push(account));
    return response({ token: `demo-${account.id}`, user: account }, 201);
  }
  if (pathname === '/uploads/single' || pathname === '/uploads/multiple') {
    requireUser();
    const form = body instanceof FormData ? body : null;
    if (!form) fail(400, 'Select an image before uploading');
    const key = pathname.endsWith('/single') ? 'file' : 'files';
    const files = await serializeFiles(form, key);
    if (!files.length) fail(400, 'No files selected');
    return response(pathname.endsWith('/single') ? files[0] : files);
  }
  if (pathname === '/designs') {
    if (!user || user.role !== 'customer') fail(403, 'Customer access required');
    if (!body.title || !body.description) fail(400, 'Add a title and description first');
    const design = {
      ...body,
      id: id('design'),
      customer_id: user.id,
      reference_images: body.reference_images || [],
      status: 'draft',
      created_at: now(),
      updated_at: now(),
    };
    updateStore((data) => data.designs.unshift(design));
    return response(design, 201);
  }
  if (pathname === '/chat/conversations') {
    if (!user || user.role !== 'customer') fail(403, 'Customer access required');
    const artisan = findUser(store, body.artisan_id);
    if (!artisan || artisan.role !== 'artisan') fail(404, 'Artisan not found');
    let conversation = store.conversations.find((item) => item.customer_id === user.id && item.artisan_id === artisan.id);
    if (!conversation) {
      conversation = { id: id('conversation'), customer_id: user.id, artisan_id: artisan.id, order_id: null, created_at: now() };
      updateStore((data) => data.conversations.unshift(conversation));
    }
    return response({ id: conversation.id }, 201);
  }
  const chatMessages = pathname.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
  if (chatMessages) {
    if (!user) fail(401, 'Sign in to continue');
    const conversation = store.conversations.find((item) => item.id === chatMessages[1] && [item.customer_id, item.artisan_id].includes(user.id));
    if (!conversation) fail(403, 'Conversation access denied');
    const message = {
      id: id('message'),
      conversation_id: conversation.id,
      sender_id: user.id,
      sender_name: user.name,
      sender_avatar: user.avatar_url,
      content: String(body.content || '').trim() || null,
      media_url: null,
      media_type: null,
      is_read: false,
      created_at: now(),
    };
    if (!message.content) fail(400, 'Enter a message');
    updateStore((data) => data.messages.push(message));
    return response(message, 201);
  }
  if (pathname === '/quotations') {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    const design = store.designs.find((item) => item.id === body.design_request_id && item.status === 'open');
    if (!design) fail(404, 'Open design request not found');
    const quote = {
      id: id('quotation'),
      design_request_id: design.id,
      artisan_id: user.id,
      customer_id: design.customer_id,
      amount: Number(body.amount),
      estimated_days: Number(body.estimated_days),
      notes: body.notes || '',
      status: 'pending',
      created_at: now(),
      updated_at: now(),
    };
    if (!(quote.amount > 0) || !(quote.estimated_days > 0)) fail(400, 'Enter a positive price and delivery time');
    updateStore((data) => {
      data.quotations.unshift(quote);
      notify(data, design.customer_id, 'New Quotation Received', `${user.name} sent you a quote for ${design.title}.`, quote.id, 'quotation');
    });
    return response(quote, 201);
  }
  if (pathname === '/ai/conversations') {
    if (!user) fail(401, 'Sign in to continue');
    const conversation = { id: id('ai-chat'), user_id: user.id, title: body.title || 'New Chat', created_at: now() };
    updateStore((data) => data.aiConversations.unshift(conversation));
    return response(conversation, 201);
  }
  if (pathname.startsWith('/ai/conversations/') && pathname.endsWith('/messages')) {
    if (!user) fail(401, 'Sign in to continue');
    const conversationId = pathname.split('/')[3];
    const conversation = store.aiConversations.find((item) => item.id === conversationId && item.user_id === user.id);
    if (!conversation) fail(404, 'Conversation not found');
    const content = String(body.content || '').trim();
    if (!content) fail(400, 'Enter a message');
    const userMessage = { id: id('ai-message'), conversation_id: conversationId, role: 'user', content, created_at: now() };
    const answer = {
      id: id('ai-message'),
      conversation_id: conversationId,
      role: 'assistant',
      content: `This is a local demo reply. For your ${content.toLowerCase().includes('silk') ? 'silk design' : 'custom design'}, add your colors, materials, budget, or an inspiration image in Dream Studio so artisans can prepare a quote.`,
      created_at: now(),
    };
    updateStore((data) => data.aiMessages.push(userMessage, answer));
    return response(answer, 201);
  }
  fail(404, `Demo page endpoint not found: ${pathname}`);
};

const put = async (path, body = {}) => {
  const user = currentUser();
  const pathname = new URL(path, 'http://demo.local').pathname.replace(/^\/api/, '');

  if (pathname === '/auth/profile') {
    if (!user) fail(401, 'Sign in to continue');
    const updated = updateStore((data) => {
      const account = findUser(data, user.id);
      if (!account) fail(404, 'Profile not found');
      Object.assign(account, body);
      return account;
    });
    localStorage.setItem('dc_user', JSON.stringify(updated));
    return response(updated);
  }
  if (pathname === '/artisans/profile') {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    const updated = updateStore((data) => {
      const account = findUser(data, user.id);
      Object.assign(account, body);
      return account;
    });
    localStorage.setItem('dc_user', JSON.stringify(updated));
    return response(updated);
  }
  const acceptQuote = pathname.match(/^\/quotations\/([^/]+)\/accept$/);
  if (acceptQuote) {
    if (!user || user.role !== 'customer') fail(403, 'Customer access required');
    const result = updateStore((data) => {
      const quote = data.quotations.find((item) => item.id === acceptQuote[1] && item.customer_id === user.id && item.status === 'pending');
      if (!quote) fail(404, 'Quote not found or already processed');
      const design = data.designs.find((item) => item.id === quote.design_request_id);
      if (!design) fail(404, 'Design request not found');
      const order = {
        id: id('order'),
        quotation_id: quote.id,
        design_request_id: quote.design_request_id,
        customer_id: quote.customer_id,
        artisan_id: quote.artisan_id,
        total_amount: quote.amount,
        status: 'awaiting_artisan_confirmation',
        notes: '',
        production_updates: [],
        created_at: now(),
        updated_at: now(),
      };
      quote.status = 'accepted';
      quote.updated_at = now();
      data.quotations.forEach((item) => {
        if (item.design_request_id === design.id && item.id !== quote.id && item.status === 'pending') item.status = 'expired';
      });
      design.status = 'awaiting_artisan_confirmation';
      design.updated_at = now();
      data.orders.unshift(order);
      let conv = data.conversations.find((item) => item.customer_id === user.id && item.artisan_id === quote.artisan_id && !item.order_id);
      if (!conv) {
        conv = { id: id('conversation'), customer_id: user.id, artisan_id: quote.artisan_id, order_id: null, created_at: now() };
        data.conversations.unshift(conv);
      }
      conv.order_id = order.id;
      notify(data, quote.artisan_id, 'Order Confirmation Requested', 'The customer selected your quotation. Confirm the order to begin.', order.id, 'order');
      return order;
    });
    return response(result);
  }
  const rejectQuote = pathname.match(/^\/quotations\/([^/]+)\/reject$/);
  if (rejectQuote) {
    if (!user || user.role !== 'customer') fail(403, 'Customer access required');
    const quote = updateStore((data) => {
      const target = data.quotations.find((item) => item.id === rejectQuote[1] && item.customer_id === user.id);
      if (!target) fail(404, 'Quote not found');
      target.status = 'rejected';
      target.updated_at = now();
      return target;
    });
    return response({ message: 'Quotation rejected', ...quote });
  }
  const confirmOrder = pathname.match(/^\/orders\/([^/]+)\/confirm$/);
  if (confirmOrder) {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    const order = updateStore((data) => {
      const target = data.orders.find((item) => item.id === confirmOrder[1] && item.artisan_id === user.id);
      if (!target) fail(404, 'Order not found');
      if (target.status !== 'awaiting_artisan_confirmation') fail(409, 'This order is not awaiting your confirmation');
      target.status = 'order_confirmed';
      target.updated_at = now();
      const design = data.designs.find((item) => item.id === target.design_request_id);
      if (design) design.status = 'in_progress';
      notify(data, target.customer_id, 'Order Confirmed', 'The artisan confirmed your order.', target.id, 'order');
      return target;
    });
    return response(order);
  }
  const orderStatus = pathname.match(/^\/orders\/([^/]+)\/status$/);
  if (orderStatus) {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    const order = updateStore((data) => {
      const target = data.orders.find((item) => item.id === orderStatus[1] && item.artisan_id === user.id);
      if (!target) fail(404, 'Order not found');
      if (target.status === 'awaiting_artisan_confirmation') fail(409, 'Confirm the order before updating its status');
      Object.assign(target, { status: body.status, notes: body.notes || target.notes, updated_at: now() });
      notify(data, target.customer_id, 'Order Status Updated', `Your order status is now: ${body.status.replace(/_/g, ' ')}`, target.id, 'order');
      return target;
    });
    return response(order);
  }
  const orderStory = pathname.match(/^\/orders\/([^/]+)\/production-update$/);
  if (orderStory) {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    const form = body instanceof FormData ? body : null;
    if (!form) fail(400, 'Provide a production update');
    const media = await serializeFiles(form, 'media');
    const item = updateStore((data) => {
      const order = data.orders.find((entry) => entry.id === orderStory[1] && entry.artisan_id === user.id);
      if (!order) fail(404, 'Order not found');
      const update = {
        id: id('update'),
        order_id: order.id,
        artisan_id: user.id,
        stage: form.get('stage'),
        caption: form.get('caption') || '',
        media_urls: media.map((file) => file.url),
        media_type: media[0]?.mimetype?.startsWith('video') ? 'video' : 'image',
        created_at: now(),
      };
      order.production_updates = [...(order.production_updates || []), update];
      notify(data, order.customer_id, 'New Making Story', 'Your artisan shared a production update.', order.id, 'order');
      return update;
    });
    return response(item, 201);
  }
  const design = pathname.match(/^\/designs\/([^/]+)$/);
  if (design) {
    if (!user || user.role !== 'customer') fail(403, 'Customer access required');
    const updated = updateStore((data) => {
      const target = data.designs.find((item) => item.id === design[1] && item.customer_id === user.id);
      if (!target) fail(404, 'Design not found');
      Object.assign(target, body, { updated_at: now() });
      return target;
    });
    return response(updated);
  }
  const addPortfolio = pathname === '/artisans/portfolio';
  if (addPortfolio) {
    if (!user || user.role !== 'artisan') fail(403, 'Artisan access required');
    const form = body instanceof FormData ? body : null;
    if (!form) fail(400, 'Select a portfolio image');
    const media = await serializeFiles(form, 'media');
    if (!media.length) fail(400, 'Select a portfolio image');
    const item = updateStore((data) => {
      const account = findUser(data, user.id);
      const portfolioItem = {
        id: id('portfolio'),
        artisan_id: user.id,
        title: form.get('title'),
        description: form.get('description'),
        category: form.get('category'),
        media_url: media[0].url,
        media_type: media[0].mimetype.startsWith('video') ? 'video' : 'image',
        created_at: now(),
      };
      account.portfolio = [portfolioItem, ...(account.portfolio || [])];
      return portfolioItem;
    });
    return response(item, 201);
  }
  fail(404, `Demo page endpoint not found: ${pathname}`);
};

const remove = (path) => {
  const user = requireUser();
  const pathname = new URL(path, 'http://demo.local').pathname.replace(/^\/api/, '');
  const item = pathname.match(/^\/artisans\/portfolio\/([^/]+)$/);
  if (item) {
    if (user.role !== 'artisan') fail(403, 'Artisan access required');
    updateStore((store) => {
      const artisan = findUser(store, user.id);
      artisan.portfolio = (artisan.portfolio || []).filter((entry) => entry.id !== item[1]);
    });
    return response({ message: 'Deleted' });
  }
  fail(404, `Demo page endpoint not found: ${pathname}`);
};

const api = {
  get: async (path) => get(path),
  post: async (path, body) => post(path, body),
  put: async (path, body) => put(path, body),
  delete: async (path) => remove(path),
};

export default api;
export { DEMO_PASSWORD };
