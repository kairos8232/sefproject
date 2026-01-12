const supabase = require('../config/supabase');
const crypto = require('crypto');

class TwoFactorAuth {
  // Generate a 6-digit code
  static generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Store 2FA code in database
  static async storeCode(userId, code) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { data, error } = await supabase
      .from('two_factor_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Verify 2FA code
  static async verifyCode(userId, code) {
    const { data, error } = await supabase
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { valid: false, message: 'Invalid or expired code' };
    }

    // Mark code as used
    await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', data.id);

    return { valid: true };
  }

  // Clean up expired codes (can be called periodically)
  static async cleanExpiredCodes() {
    const { error } = await supabase
      .from('two_factor_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) console.error('Error cleaning expired 2FA codes:', error);
  }
}

module.exports = TwoFactorAuth;
