const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// ===== 重要：把你的真实值填到这里 =====
const SUPABASE_URL = 'https://gokylccajekqkxjkdvty.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JrvfQGKxnXRaPSvPN9cmDQ_rm_KiwK3';
// =======================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 允许跨域请求（让前端能调用后端）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ===== 1. 读取锁信息接口 =====
app.post('/api/lock/read', async (req, res) => {
  const { lockId, mid } = req.body;
  const { data: lock, error } = await supabase.from('locks').select('*').eq('id', lockId).single();
  if (error || !lock) return res.json({ success: false, message: '未找到该锁' });
  if (lock.mid !== mid) return res.json({ success: false, message: 'MID 不匹配' });
  res.json({ success: true, data: lock });
});

// ===== 2. 执行开锁接口 =====
app.post('/api/lock/unlock', async (req, res) => {
  const { lockId } = req.body;
  const { data: lock } = await supabase.from('locks').select('quota, locked').eq('id', lockId).single();
  if (!lock || !lock.locked || lock.quota <= 0) return res.json({ success: false, message: '无法开锁' });
  const newQuota = lock.quota - 1;
  await supabase.from('locks').update({ locked: false, quota: newQuota }).eq('id', lockId);
  res.json({ success: true, message: '开锁成功', newQuota });
});

// ===== 3. 派对减时间接口 =====
app.post('/api/lock/party', async (req, res) => {
  const { lockId } = req.body;
  const { data: lock } = await supabase.from('locks').select('quota, party_enabled, party_active').eq('id', lockId).single();
  if (!lock || !lock.party_enabled || lock.party_active || lock.quota <= 0) return res.json({ success: false, message: '无法执行' });
  const newQuota = lock.quota - 1;
  await supabase.from('locks').update({ party_active: true, quota: newQuota }).eq('id', lockId);
  res.json({ success: true, message: '派对减时间成功', newQuota });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));