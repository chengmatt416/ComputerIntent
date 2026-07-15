"""AgentLab bridge for LHIC's deterministic semantic-BID policy.

This is an intentionally narrow, fail-closed adapter. It exposes only explicit
low-risk search, fill, select, and navigation-click policies in
``lhic_semantic_policy`` and reports all other tasks as infeasible. Do not use
it for a full-suite or leaderboard submission until external evidence exists.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import bgym
from agentlab.agents.agent_args import AgentArgs

from lhic_semantic_policy import PlanState, propose_plan_action


@dataclass
class LhicSemanticAgentArgs(AgentArgs):
    agent_name: str = "LhicSemanticBidAgent"

    def make_agent(self) -> bgym.Agent:
        return LhicSemanticAgent()

    def set_reproducibility_mode(self) -> None:
        return None

    def prepare(self) -> None:
        return None

    def close(self) -> None:
        return None


class LhicSemanticAgent(bgym.Agent):
    def __init__(self) -> None:
        self._plan_state_by_goal: dict[str, PlanState] = {}
        self._pending_action_by_goal: dict[str, str] = {}
        self._blocked_goals: set[str] = set()
        self._blocked_reasons: dict[str, str] = {}
        self.action_set = bgym.HighLevelActionSet(["bid", "infeas"], multiaction=False)

    def get_action(self, obs: Any) -> tuple[str, dict[str, Any]]:
        goal = str(obs.get("goal", ""))
        pruned_html = str(obs.get("pruned_html", ""))
        if goal in self._blocked_goals:
            return self._blocked_action(goal)
        if _has_action_error(obs.get("last_action_error")):
            return self._block_goal(
                goal,
                "A previous browser action failed; the deterministic adapter stopped "
                "this goal rather than retrying or advancing without verification.",
            )

        pending_action = self._pending_action_by_goal.get(goal)
        if pending_action is not None:
            if obs.get("last_action") != pending_action:
                return self._block_goal(
                    goal,
                    "The previous browser action was not echoed by BrowserGym; the "
                    "deterministic adapter stopped this goal rather than advancing "
                    "without an execution receipt.",
                )
            del self._pending_action_by_goal[goal]

        state = self._plan_state_by_goal.get(goal, PlanState())
        plan = propose_plan_action(goal, pruned_html, state)
        self._plan_state_by_goal[goal] = plan.next_state
        if not plan.decision.action.startswith(("noop(", "report_infeasible(")):
            self._pending_action_by_goal[goal] = plan.decision.action
        return (
            plan.decision.action,
            bgym.AgentInfo(
                think=plan.decision.reason,
                stats={"lhic_semantic_policy": 1, "plan_steps": plan.step_count},
                extra_info={
                    "phase": plan.decision.phase,
                    "stepIndex": state.step_index,
                    "completed": plan.completed,
                },
            ),
        )

    def _block_goal(self, goal: str, reason: str) -> tuple[str, dict[str, Any]]:
        self._blocked_goals.add(goal)
        self._blocked_reasons[goal] = reason
        self._pending_action_by_goal.pop(goal, None)
        return self._blocked_action(goal)

    def _blocked_action(self, goal: str) -> tuple[str, dict[str, Any]]:
        reason = self._blocked_reasons.get(
            goal,
            "The deterministic adapter stopped this goal rather than retrying or "
            "advancing without verification.",
        )
        state = self._plan_state_by_goal.get(goal, PlanState())
        stats = {"lhic_semantic_policy": 1}
        if reason.startswith("A previous browser action failed"):
            stats["action_error_blocked"] = 1
        return (
            f"report_infeasible({json.dumps(reason)})",
            bgym.AgentInfo(
                think=reason,
                stats=stats,
                extra_info={
                    "phase": state.phase,
                    "stepIndex": state.step_index,
                    "completed": False,
                    "blocked": True,
                },
            ),
        )


def _has_action_error(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())
