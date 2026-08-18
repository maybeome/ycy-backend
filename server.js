const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// 允许解析 JSON 请求体
app.use(express.json());

// ===== 在这里填入你的 Supabase 信息 =====
const SUPABASE_URL = 'https://gokylccajekqkxjkdvty.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JrvfQGKxnXRaPSvPN9cmDQ_rm_KiwK3';
// =======================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== 允许跨域请求（让前端能调用后端） =====
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ===== 1. 读取锁信息接口 =====
app.get('/api/lock/read', async (req, res) => {
  const { lockId, mid } = req.query;
  if (!lockId || !mid) {
    return res.json({ success: false, message: '缺少 lockId 或 mid 参数' });
  }
  const { data: lock, error } = await supabase
    .from('locks')
    .select('*')
    .eq('id', lockId)
    .single();
  if (error || !lock) {
    return res.json({ success: false, message: '未找到该锁' });
  }
  if (lock.mid !== mid) {
    return res.json({ success: false, message: 'MID 不匹配' });
  }
  res.json({ success: true, data: lock });
});

// ===== 2. 执行开锁接口 =====
app.post('/api/lock/unlock', async (req, res) => {
  const { lockId } = req.body;
  if (!lockId) {
    return res.json({ success: false, message: '缺少 lockId' });
  }
  const { data: lock, error } = await supabase
    .from('locks')
    .select('quota, locked')
    .eq('id', lockId)
    .single();
  if (error || !lock) {
    return res.json({ success: false, message: '未找到该锁' });
  }
  if (!lock.locked) {
    return res.json({ success: false, message: '该锁已解锁' });
  }
  if (lock.quota <= 0) {
    return res.json({ success: false, message: '今日额度已用完' });
  }
  const newQuota = lock.quota - 1;
  await supabase
    .from('locks')
    .update({ locked: false, quota: newQuota })
    .eq('id', lockId);
  res.json({ success: true, message: '开锁成功', newQuota });
});

// ===== 3. 派对减时间接口 =====
app.post('/api/lock/party', async (req, res) => {
  const { lockId } = req.body;
  if (!lockId) {
    return res.json({ success: false, message: '缺少 lockId' });
  }
  const { data: lock, error } = await supabase
    .from('locks')
    .select('quota, party_enabled, party_active')
    .eq('id', lockId)
    .single();
  if (error || !lock) {
    return res.json({ success: false, message: '未找到该锁' });
  }
  if (!lock.party_enabled) {
    return res.json({ success: false, message: '该锁未启用派对功能' });
  }
  if (lock.party_active) {
    return res.json({ success: false, message: '派对正在进行中' });
  }
  if (lock.quota <= 0) {
    return res.json({ success: false, message: '今日额度已用完' });
  }
  const newQuota = lock.quota - 1;
  await supabase
    .from('locks')
    .update({ party_active: true, quota: newQuota })
    .eq('id', lockId);
  res.json({ success: true, message: '派对减时间成功', newQuota });
});

// ===== 根路径测试 =====
app.get('/', (req, res) => {
  res.json({ message: 'YCY Backend API is running!' });
});

// ===== Vercel 适配：导出 app =====
module.exports = app;

// ===== 本地运行时启动服务器 =====
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
