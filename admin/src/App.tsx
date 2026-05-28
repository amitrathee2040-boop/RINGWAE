import { Router, Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Players from "@/pages/Players";
import Matches from "@/pages/Matches";
import Rewards from "@/pages/Rewards";
import Ads from "@/pages/Ads";
import Announcements from "@/pages/Announcements";
import Logs from "@/pages/Logs";

const BASE = (import.meta.env.BASE_URL ?? "/admin/").replace(/\/$/, "");

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
        <div className="spinner" style={{ width: 32, height: 32, border: "3px solid rgba(245,158,11,0.2)", borderTopColor: "#f59e0b", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Layout>
      <Switch>
        <Route path="/"              component={Dashboard} />
        <Route path="/players"       component={Players} />
        <Route path="/matches"       component={Matches} />
        <Route path="/rewards"       component={Rewards} />
        <Route path="/ads"           component={Ads} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/logs"          component={Logs} />
        <Route><Redirect to="/" /></Route>
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router base={BASE}>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
