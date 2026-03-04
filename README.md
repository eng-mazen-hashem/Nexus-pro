# Nexus POS — نظام إدارة المقاهي

## هيكل المشروع
```
public/
├── login.html          — تسجيل الدخول
├── index.html          — منيو الزبون
├── dashboard.html      — لوحة الكاشير
├── kitchen.html        — شاشة المطبخ
├── warehouse.html      — إدارة المخزون
├── master_admin.html   — لوحة الإدارة العليا
├── dev_panel.html      — لوحة المطور
├── setup.html          — إعداد النظام
└── js/
    └── supabaseClient.js
```

## التشغيل المحلي
```bash
firebase emulator:start --only hosting
```

## النشر
```bash
firebase deploy
```
