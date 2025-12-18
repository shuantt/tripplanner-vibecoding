import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

export const Login: React.FC = () => {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (isRegister && !name) {
            setError('請輸入暱稱');
            setLoading(false);
            return;
        }

        let res;
        if (isRegister) {
            res = await register(email, password, name);
            if (res.success) {
                // Auto login after register
                res = await login(email, password);
            }
        } else {
            res = await login(email, password);
        }

        if (!res.success) {
            setError(res.error || '操作失敗');
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-stone-800 mb-2 text-center">
                    {isRegister ? '註冊帳號' : '歡迎回來'}
                </h1>
                <p className="text-stone-500 mb-8 text-center text-sm">
                    {isRegister ? '加入旅程，開始規劃你的冒險' : '登入以存取你的旅遊計畫'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">暱稱</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 outline-none"
                                placeholder="你的名字"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 outline-none"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 outline-none"
                            placeholder="******"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? '處理中...' : (isRegister ? <><UserPlus size={18} /> 註冊</> : <><LogIn size={18} /> 登入</>)}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-stone-500">
                    {isRegister ? '已經有帳號？' : '還沒有帳號？'}
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        className="ml-2 text-stone-900 font-medium hover:underline"
                    >
                        {isRegister ? '登入' : '註冊'}
                    </button>
                </div>
            </div>
        </div>
    );
};
