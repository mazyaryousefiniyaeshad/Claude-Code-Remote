import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { readToken } from "./lib/storage";
import { SignIn } from "./features/auth/SignIn";
import { HomeScreen } from "./features/home/HomeScreen";
import { ChatScreen } from "./features/chat/ChatScreen";
import { SessionsScreen } from "./features/sessions/SessionsScreen";
import { FilesScreen } from "./features/files/FilesScreen";
import { PortsScreen } from "./features/ports/PortsScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";

export function App() {
  const [token, setToken] = useState(() => readToken());

  if (!token) return <SignIn onSignedIn={() => setToken(readToken())} />;

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/sessions" element={<SessionsScreen />} />
      <Route path="/chat" element={<ChatScreen />} />
      <Route path="/files" element={<FilesScreen />} />
      <Route path="/ports" element={<PortsScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
