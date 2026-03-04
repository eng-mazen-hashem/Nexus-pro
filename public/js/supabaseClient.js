// ============================================================
// supabaseClient.js — النسخة الآمنة والمحترفة
// يدعم Multi-tenancy + Auth آمن + قابل للتوسع العالمي
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ✅ هذه القيم عامة وآمنة — الحماية الحقيقية عبر RLS في Supabase
const SUPABASE_URL  = 'https://ciaxpriqwfwhdmmxassx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYXhwcmlxd2Z3aGRtbXhhc3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjU5MTcsImV4cCI6MjA4NzYwMTkxN30.sANcLOEVjgdzIFFqCoxXs8WS_emOzW2XeYwVmdzIolM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ============================================================
// نظام الـ Session — يحفظ بيانات المقهى والمستخدم بأمان
// ============================================================

const SESSION_KEY = 'nexus_session';

export const NexusAuth = {

  // تسجيل الدخول — يتحقق من قاعدة البيانات مباشرة
  async login(cafeId, username, password) {
    try {
      const { data, error } = await supabase.rpc('verify_cafe_user', {
        p_cafe_id:  cafeId,
        p_username: username,
        p_password: password,
      });

      if (error || !data || data.length === 0) {
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }

      const user = data[0];
      const session = {
        cafeId,
        userId:   user.user_id,
        role:     user.role,       // cashier | manager | owner
        branchId: user.branch_id,
        loginAt:  Date.now(),
      };

      // حفظ الـ session في localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      return { success: true, session };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'حدث خطأ في الاتصال' };
    }
  },

  // جلب الـ session الحالية
  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Session تنتهي بعد 12 ساعة
      if (Date.now() - session.loginAt > 12 * 60 * 60 * 1000) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  // تسجيل الخروج
  logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  },

  // التحقق من الصلاحية
  hasRole(requiredRole) {
    const session = this.getSession();
    if (!session) return false;
    const roles = { cashier: 1, manager: 2, owner: 3 };
    return (roles[session.role] || 0) >= (roles[requiredRole] || 0);
  },

  // حماية الصفحة — يعيد التوجيه إذا لم يكن مسجلاً
  requireAuth(requiredRole = 'cashier') {
    const session = this.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    if (requiredRole && !this.hasRole(requiredRole)) {
      alert('ليس لديك صلاحية للوصول لهذه الصفحة');
      window.location.href = 'index.html';
      return null;
    }
    return session;
  },
};

// ============================================================
// دالة مساعدة — تضيف cafe_id تلقائياً لكل استعلام
// الاستخدام: db.from('orders').select('*')
// بدلاً من: supabase.from('orders').select('*').eq('cafe_id', cafeId)
// ============================================================

export function db() {
  const session = NexusAuth.getSession();
  const cafeId  = session?.cafeId || 'cafe_default';

  // نعيد supabase مع helper يضيف cafe_id تلقائياً
  return {
    from(table) {
      return {
        _table: table,
        _cafeId: cafeId,

        select(cols = '*') {
          return supabase.from(table).select(cols).eq('cafe_id', cafeId);
        },
        insert(payload) {
          const data = Array.isArray(payload)
            ? payload.map(row => ({ ...row, cafe_id: cafeId }))
            : { ...payload, cafe_id: cafeId };
          return supabase.from(table).insert(data);
        },
        update(payload) {
          return supabase.from(table).update(payload).eq('cafe_id', cafeId);
        },
        delete() {
          return supabase.from(table).delete().eq('cafe_id', cafeId);
        },
        // للاستعلامات المعقدة — تعيد supabase العادي مع cafe_id مضبوط
        raw() {
          return supabase.from(table).select('*').eq('cafe_id', cafeId);
        },
      };
    },

    // للـ Realtime — يفلتر على cafe_id تلقائياً
    channel(name) {
      return supabase.channel(`${cafeId}_${name}`);
    },

    rpc(fn, params) {
      return supabase.rpc(fn, { ...params, p_cafe_id: cafeId });
    },
  };
}
