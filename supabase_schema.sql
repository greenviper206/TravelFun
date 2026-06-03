-- 📋 Supabase SQL Schema 設定檔
-- 請在 Supabase 專案的 SQL Editor 中直接執行此腳本來初始化資料庫表格。

-- 1. 建立行程表格
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 綁定 Supabase Auth 用戶
  title TEXT NOT NULL,
  country TEXT NOT NULL, -- 一級篩選標籤 (國家)
  city TEXT NOT NULL,    -- 二級篩選標籤 (城市)
  is_public BOOLEAN DEFAULT false, -- 是否公開顯示在大廳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  days_data JSONB NOT NULL -- 以 JSONB 格式直接存放天數與景點的完整陣列
);

-- 2. 建立索引加速 Explore 大廳之篩選速度
CREATE INDEX IF NOT EXISTS idx_trips_country_city ON trips(country, city) WHERE is_public = true;

-- 3. 啟用資料庫安全原則 (Row Level Security)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 4. 安全原則 A：允許所有人讀取已公開的行程 (大廳頁面)
CREATE POLICY "Allow public read-only access to shared trips"
  ON trips FOR SELECT
  USING (is_public = true);

-- 5. 安全原則 B：允許登入用戶管理（創建、修改、刪除）屬於自己的行程
CREATE POLICY "Allow users to manage their own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
