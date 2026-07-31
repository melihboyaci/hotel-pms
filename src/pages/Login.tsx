import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const transformedEmail = `${username.toLowerCase().trim()}@heracity.com`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: transformedEmail,
      password,
    });

    if (signInError) {
      setError("Kullanıcı adı veya şifre hatalı. Lütfen tekrar deneyin.");
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Alanı */}
        <div className="bg-black py-8 px-6 flex flex-col items-center border-b-[3px] border-gold-500">
          <img
            src="/logo.png"
            alt="Hera City Hotel Logo"
            className="h-20 w-auto object-contain mb-4"
          />
          <h1 className="text-2xl font-bold tracking-[0.15em] text-gold-500 font-cinzel uppercase text-center">
            Hera City Hotel
          </h1>
          <p className="text-gold-300/70 text-xs tracking-widest uppercase mt-2">
            Resepsiyon Yönetim Sistemi
          </p>
        </div>

        {/* Form Alanı */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide"
              >
                Kullanıcı Adı
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors text-gray-800"
                placeholder="Kullanıcı Adı"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide"
              >
                Şıfre
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors text-gray-800"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-gold-400 font-bold tracking-widest uppercase py-3.5 rounded-lg border border-gold-500/30 hover:bg-gray-900 hover:text-gold-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-gold-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Giriş Yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
