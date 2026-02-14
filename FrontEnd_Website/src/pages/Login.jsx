import {useState} from "react";

export default function Login({onLogin}){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        if (!username || !password) return;

        onLogin(username);
        window.location.pathname = "/tournaments";
    };

    return(
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
            <button onClick={handleLogin}>
                Login
            </button>
        </div>
    );
}