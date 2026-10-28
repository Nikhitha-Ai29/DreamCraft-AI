const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('./pool');

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    phone VARCHAR(20),
    bio TEXT,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_users_phone (phone),
    CONSTRAINT chk_users_role CHECK (role IN ('customer','artisan','admin'))
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS artisan_profiles (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    specializations JSON,
    skills JSON,
    experience_years INT DEFAULT 0,
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0,
    total_orders INT DEFAULT 0,
    portfolio_description TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_artisan_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS portfolio_items (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    artisan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'image',
    category VARCHAR(100),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_portfolio_items_artisan (artisan_id),
    CONSTRAINT fk_portfolio_items_artisan FOREIGN KEY (artisan_id) REFERENCES artisan_profiles(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS design_requests (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    colors JSON,
    materials JSON,
    style VARCHAR(100),
    pattern VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    reference_images JSON,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_design_requests_customer (customer_id),
    CONSTRAINT fk_design_requests_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS generated_designs (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    design_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'dalle',
    is_saved BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_generated_designs_request FOREIGN KEY (design_request_id) REFERENCES design_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_generated_designs_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    title VARCHAR(200),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ai_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS ai_messages (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_ai_messages_conv (conversation_id, created_at),
    CONSTRAINT chk_ai_messages_role CHECK (role IN ('user','assistant','system')),
    CONSTRAINT fk_ai_messages_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS quotations (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    design_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    artisan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    amount DECIMAL(10,2) NOT NULL,
    estimated_days INT NOT NULL,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_quotations_status CHECK (status IN ('pending','accepted','rejected','expired')),
    CONSTRAINT fk_quotations_request FOREIGN KEY (design_request_id) REFERENCES design_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotations_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotations_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    quotation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    design_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    artisan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    status VARCHAR(50) DEFAULT 'design_submitted',
    total_amount DECIMAL(10,2),
    notes TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_artisan (artisan_id),
    CONSTRAINT fk_orders_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    CONSTRAINT fk_orders_request FOREIGN KEY (design_request_id) REFERENCES design_requests(id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS production_updates (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    artisan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    stage VARCHAR(100) NOT NULL,
    caption TEXT,
    media_urls JSON,
    media_type VARCHAR(20) DEFAULT 'image',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_production_updates_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_production_updates_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS chat_conversations (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    artisan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin UNIQUE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_chat_conversations_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_conversations_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_conversations_order FOREIGN KEY (order_id) REFERENCES orders(id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    sender_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    content TEXT,
    media_url TEXT,
    media_type VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_chat_messages_conv (conversation_id),
    CONSTRAINT fk_chat_messages_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    reference_type VARCHAR(50),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_notifications_user (user_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    customer_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    artisan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];

const ensureUniquePhoneIndex = async () => {
  const indexes = await pool.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='uq_users_phone'`
  );
  if (!indexes.rows.length) {
    const duplicates = await pool.query(
      `SELECT COUNT(*) AS duplicate_groups FROM (
         SELECT phone FROM users
         WHERE phone IS NOT NULL AND phone <> ''
         GROUP BY phone HAVING COUNT(*) > 1
       ) duplicate_phones`
    );
    if (Number(duplicates.rows[0].duplicate_groups) > 0) {
      throw new Error(
        'Cannot add unique phone numbers: existing duplicate phone values must be reviewed first'
      );
    }
    await pool.query('ALTER TABLE users ADD UNIQUE INDEX uq_users_phone (phone)');
  }
};

const removeLegacyPhoneVerificationSchema = async () => {
  await pool.query('DROP TABLE IF EXISTS phone_verification_challenges');
  const columns = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='phone_verified'`
  );
  if (columns.rows.length) {
    await pool.query('ALTER TABLE users DROP COLUMN phone_verified');
  }
};

const migrate = async () => {
  try {
    for (const statement of statements) await pool.query(statement);
    await ensureUniquePhoneIndex();
    await removeLegacyPhoneVerificationSchema();
    console.log('MySQL database migration completed successfully');
  } catch (err) {
    console.error('MySQL migration failed:', err.code || err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

migrate();
