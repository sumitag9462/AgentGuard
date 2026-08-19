import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import DemoFlow from "./pages/DemoFlow";

import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import ConnectAgent from "./pages/ConnectAgent";
import AgentDetail from "./pages/AgentDetail";
import Evaluations from "./pages/Evaluations";
import EvaluationDetails from "./pages/EvaluationDetails";
import FailureDetails from "./pages/FailureDetails";
import TraceViewer from "./pages/TraceViewer";
import Scenarios from "./pages/Scenarios";
import Compare from "./pages/Compare";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoFlow />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/connect" element={<ConnectAgent />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="evaluations/:id" element={<EvaluationDetails />} />
        <Route path="failures/:id" element={<FailureDetails />} />
        <Route path="traces/:testId" element={<TraceViewer />} />
        <Route path="scenarios" element={<Scenarios />} />
        <Route path="compare" element={<Compare />} />
      </Route>
    </Routes>
  );
}

export default App;