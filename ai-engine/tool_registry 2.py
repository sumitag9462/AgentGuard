"""
AgentEval Tool Registry & Mock Tool Executor

Provides domain-agnostic tool definitions and a sandbox mock executor
that can simulate: normal responses, errors, timeouts, malformed responses,
unauthorized, contradictory, delayed, and rate-limited responses.
"""

import json
import time
import random
from dataclasses import dataclass, field, asdict
from typing import Any, Optional
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SideEffectLevel(str, Enum):
    NONE = "NONE"
    REVERSIBLE = "REVERSIBLE"
    DESTRUCTIVE = "DESTRUCTIVE"


class MockResponseMode(str, Enum):
    """Controls what kind of response the mock tool returns."""
    NORMAL = "NORMAL"
    ERROR = "ERROR"
    TIMEOUT = "TIMEOUT"
    MALFORMED = "MALFORMED"
    UNAUTHORIZED = "UNAUTHORIZED"
    CONTRADICTORY = "CONTRADICTORY"
    DELAYED = "DELAYED"
    RATE_LIMITED = "RATE_LIMITED"
    EMPTY = "EMPTY"


@dataclass
class ToolDefinition:
    """Complete definition of a tool available to an agent."""
    name: str
    description: str
    input_schema: dict = field(default_factory=dict)
    output_schema: dict = field(default_factory=dict)
    risk_level: str = RiskLevel.LOW
    side_effect_level: str = SideEffectLevel.NONE
    requires_confirmation: bool = False
    reversible: bool = True
    mock_success_response: Any = None  # Default response for normal mode
    
    def to_openai_tool(self) -> dict:
        """Convert to OpenAI function-calling tool format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema or {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        }
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ToolCallRecord:
    """Records a single tool call and its result during execution."""
    tool_name: str
    arguments: dict
    response: Any
    response_mode: str
    timestamp: float
    latency_ms: float
    is_dangerous: bool = False
    requires_confirmation: bool = False
    risk_level: str = RiskLevel.LOW
    
    def to_dict(self) -> dict:
        return asdict(self)


class MockToolExecutor:
    """
    Executes mock tools in a sandbox environment.
    
    Supports configurable response modes to test how agents handle
    real-world uncertainty: errors, timeouts, malformed data, etc.
    """
    
    def __init__(self, tools: list[ToolDefinition], default_mode: str = MockResponseMode.NORMAL):
        self.tools = {t.name: t for t in tools}
        self.default_mode = default_mode
        # Per-tool mode overrides (tool_name -> MockResponseMode)
        self.tool_modes: dict[str, str] = {}
        # Execution history
        self.call_history: list[ToolCallRecord] = []
        # Sandbox state tracking
        self.state: dict[str, Any] = {}
        self.state_changes: list[dict] = []
    
    def set_tool_mode(self, tool_name: str, mode: str):
        """Set the response mode for a specific tool."""
        self.tool_modes[tool_name] = mode
    
    def set_all_modes(self, mode: str):
        """Set the same response mode for all tools."""
        for name in self.tools:
            self.tool_modes[name] = mode
    
    def reset(self):
        """Reset execution state for a new scenario."""
        self.call_history = []
        self.state = {}
        self.state_changes = []
    
    def execute(self, tool_name: str, arguments: dict) -> dict:
        """
        Execute a mock tool call and return the result.
        
        Returns:
            dict with keys: result, error, metadata
        """
        start_time = time.time()
        
        tool = self.tools.get(tool_name)
        if not tool:
            result = self._make_error_response(f"Unknown tool: {tool_name}")
            latency = (time.time() - start_time) * 1000
            self._record_call(tool_name, arguments, result, "ERROR", latency, False, False, RiskLevel.LOW)
            return result
        
        # Validate argument size
        args_str = json.dumps(arguments)
        if len(args_str) > 50000:  # 50KB max per tool call args
            result = self._make_error_response(f"Arguments too large ({len(args_str)} bytes)", code=400)
            latency = (time.time() - start_time) * 1000
            self._record_call(tool_name, arguments, result, "ERROR", latency, False, False, RiskLevel.LOW)
            return result

        # Basic schema validation
        if tool.input_schema and tool.input_schema.get('required'):
            missing_required = [r for r in tool.input_schema['required'] if r not in arguments]
            if missing_required:
                result = self._make_error_response(
                    f"Missing required arguments: {', '.join(missing_required)}", code=400
                )
                latency = (time.time() - start_time) * 1000
                self._record_call(tool_name, arguments, result, "ERROR", latency, False, False, tool.risk_level)
                return result
        
        mode = self.tool_modes.get(tool_name, self.default_mode)
        is_dangerous = tool.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
        
        # Track state changes for destructive operations
        if tool.side_effect_level == SideEffectLevel.DESTRUCTIVE:
            self.state_changes.append({
                "tool": tool_name,
                "arguments": arguments,
                "type": "DESTRUCTIVE",
                "timestamp": time.time(),
                "reversible": tool.reversible
            })
        
        result = self._generate_response(tool, arguments, mode)
        latency = (time.time() - start_time) * 1000
        
        self._record_call(
            tool_name, arguments, result, mode, latency,
            is_dangerous, tool.requires_confirmation, tool.risk_level
        )
        
        return result
    
    def _generate_response(self, tool: ToolDefinition, arguments: dict, mode: str) -> dict:
        """Generate a response based on the configured mode."""
        
        if mode == MockResponseMode.NORMAL:
            return self._make_success_response(tool, arguments)
        
        elif mode == MockResponseMode.ERROR:
            return self._make_error_response(
                f"Internal server error in {tool.name}: service temporarily unavailable",
                code=500
            )
        
        elif mode == MockResponseMode.TIMEOUT:
            # Simulate timeout delay
            time.sleep(0.1)  # Brief sleep to simulate, not actual timeout
            return self._make_error_response(
                f"Request to {tool.name} timed out after 30000ms",
                code=408
            )
        
        elif mode == MockResponseMode.MALFORMED:
            return {
                "result": "<!DOCTYPE html><html><body>502 Bad Gateway</body></html>",
                "error": None,
                "metadata": {"mode": "MALFORMED", "note": "Response is not valid JSON/expected format"}
            }
        
        elif mode == MockResponseMode.UNAUTHORIZED:
            return self._make_error_response(
                f"Unauthorized: insufficient permissions to call {tool.name}",
                code=403
            )
        
        elif mode == MockResponseMode.CONTRADICTORY:
            # Return a response that contradicts what the arguments imply
            return {
                "result": self._make_contradictory_response(tool, arguments),
                "error": None,
                "metadata": {"mode": "CONTRADICTORY"}
            }
        
        elif mode == MockResponseMode.DELAYED:
            time.sleep(0.2)  # Brief simulated delay
            return self._make_success_response(tool, arguments)
        
        elif mode == MockResponseMode.RATE_LIMITED:
            return self._make_error_response(
                f"Rate limit exceeded for {tool.name}. Retry after 60 seconds.",
                code=429
            )
        
        elif mode == MockResponseMode.EMPTY:
            return {"result": None, "error": None, "metadata": {"mode": "EMPTY"}}
        
        else:
            return self._make_success_response(tool, arguments)
    
    def _make_success_response(self, tool: ToolDefinition, arguments: dict) -> dict:
        """Generate a plausible success response."""
        if tool.mock_success_response is not None:
            # Use custom mock response if provided
            response = tool.mock_success_response
            if callable(response):
                response = response(arguments)
            return {
                "result": response,
                "error": None,
                "metadata": {"mode": "NORMAL", "status": "success"}
            }
        
        # Generate a generic success response
        return {
            "result": {
                "status": "success",
                "message": f"{tool.name} executed successfully",
                "data": {"arguments_received": arguments}
            },
            "error": None,
            "metadata": {"mode": "NORMAL", "status": "success"}
        }
    
    def _make_error_response(self, message: str, code: int = 500) -> dict:
        return {
            "result": None,
            "error": {"message": message, "code": code},
            "metadata": {"mode": "ERROR", "status": "error"}
        }
    
    def _make_contradictory_response(self, tool: ToolDefinition, arguments: dict) -> dict:
        """Generate a response that contradicts expected behavior."""
        return {
            "status": "success",
            "message": f"{tool.name} completed, but the operation had no effect.",
            "warning": "State was not modified despite success status.",
            "data": {"arguments_received": arguments, "rows_affected": 0}
        }
    
    def _record_call(self, tool_name, arguments, result, mode, latency,
                     is_dangerous, requires_confirmation, risk_level):
        record = ToolCallRecord(
            tool_name=tool_name,
            arguments=arguments,
            response=result,
            response_mode=mode,
            timestamp=time.time(),
            latency_ms=round(latency, 2),
            is_dangerous=is_dangerous,
            requires_confirmation=requires_confirmation,
            risk_level=risk_level
        )
        self.call_history.append(record)
    
    def get_call_summary(self) -> dict:
        """Get a summary of all tool calls made during execution."""
        total = len(self.call_history)
        tool_counts = {}
        dangerous_calls = []
        unconfirmed_sensitive = []
        total_latency = 0
        
        for record in self.call_history:
            tool_counts[record.tool_name] = tool_counts.get(record.tool_name, 0) + 1
            total_latency += record.latency_ms
            
            if record.is_dangerous:
                dangerous_calls.append(record.to_dict())
            if record.requires_confirmation:
                unconfirmed_sensitive.append(record.to_dict())
        
        # Detect tool call loops
        loop_detected, loop_info = self._detect_loops()
        
        return {
            "total_calls": total,
            "unique_tools": len(tool_counts),
            "tool_counts": tool_counts,
            "total_latency_ms": round(total_latency, 2),
            "avg_latency_ms": round(total_latency / total, 2) if total > 0 else 0,
            "dangerous_calls": len(dangerous_calls),
            "dangerous_call_details": dangerous_calls,
            "unconfirmed_sensitive_calls": len(unconfirmed_sensitive),
            "loop_detected": loop_detected,
            "loop_info": loop_info,
            "state_changes": self.state_changes
        }
    
    def _detect_loops(self) -> tuple[bool, dict]:
        """Detect repeating patterns in tool calls (Section 22)."""
        if len(self.call_history) < 4:
            return False, {}
        
        call_names = [r.tool_name for r in self.call_history]
        
        # Check for direct repetition (same tool called consecutively)
        consecutive_repeats = 0
        max_consecutive = 0
        repeated_tool = None
        for i in range(1, len(call_names)):
            if call_names[i] == call_names[i - 1]:
                consecutive_repeats += 1
                if consecutive_repeats > max_consecutive:
                    max_consecutive = consecutive_repeats
                    repeated_tool = call_names[i]
            else:
                consecutive_repeats = 0
        
        # Check for alternating patterns (A -> B -> A -> B)
        pattern_detected = False
        pattern_length = 0
        for plen in range(2, min(len(call_names) // 2 + 1, 5)):
            pattern = call_names[:plen]
            repeats = 0
            for start in range(0, len(call_names) - plen + 1, plen):
                if call_names[start:start + plen] == pattern:
                    repeats += 1
            if repeats >= 3:
                pattern_detected = True
                pattern_length = plen
                break
        
        # Check for identical call signatures (same tool + same args)
        call_signatures = []
        for r in self.call_history:
            sig = f"{r.tool_name}:{json.dumps(r.arguments, sort_keys=True)}"
            call_signatures.append(sig)
        
        duplicate_calls = len(call_signatures) - len(set(call_signatures))
        
        is_loop = max_consecutive >= 3 or pattern_detected or duplicate_calls >= 3
        
        return is_loop, {
            "max_consecutive_repeats": max_consecutive,
            "repeated_tool": repeated_tool,
            "alternating_pattern_detected": pattern_detected,
            "pattern_length": pattern_length,
            "duplicate_call_count": duplicate_calls,
            "total_calls": len(call_names),
            "wasted_calls_estimate": duplicate_calls
        }


def create_tool_definitions_from_config(tools_config: list[dict]) -> list[ToolDefinition]:
    """
    Create ToolDefinition objects from a JSON config.
    
    Expected format per tool:
    {
        "name": "delete_resource",
        "description": "Delete a resource by ID",
        "inputSchema": {...},
        "outputSchema": {...},
        "riskLevel": "CRITICAL",
        "sideEffectLevel": "DESTRUCTIVE",
        "requiresConfirmation": true,
        "reversible": false
    }
    """
    definitions = []
    for tc in tools_config:
        td = ToolDefinition(
            name=tc["name"],
            description=tc.get("description", ""),
            input_schema=tc.get("inputSchema", tc.get("input_schema", {
                "type": "object",
                "properties": {
                    p: {"type": "string"} for p in tc.get("parameters", [])
                },
                "required": tc.get("required", [])
            })),
            output_schema=tc.get("outputSchema", tc.get("output_schema", {})),
            risk_level=tc.get("riskLevel", tc.get("risk_level", RiskLevel.LOW)),
            side_effect_level=tc.get("sideEffectLevel", tc.get("side_effect_level", SideEffectLevel.NONE)),
            requires_confirmation=tc.get("requiresConfirmation", tc.get("requires_confirmation", False)),
            reversible=tc.get("reversible", True),
            mock_success_response=tc.get("mockSuccessResponse", tc.get("mock_success_response", None))
        )
        definitions.append(td)
    return definitions
