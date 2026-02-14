import {useState} from "react";

export default function Login({onLogin}){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e) => {
        //prevents page reload
        e.preventDefault(); 
        if (!username || !password) return;

        onLogin(username);window.history.pushState({}, "", "/tournaments");
        window.dispatchEvent(new Event("popstate"));
    };

    return(
        <form className="login" onSubmit={handleLogin}>
            <div className="login">
                <h1>Login</h1>
                <input 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">
                    Login
                </button>
            </div>
        </form>
    );
}