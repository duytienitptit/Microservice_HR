from langgraph.graph import StateGraph, END
from app.graph.state import InterviewState
from app.graph.nodes.greeting import greeting_node
from app.graph.nodes.experience_review import experience_review_node
from app.graph.nodes.technical_questions import technical_questions_node
from app.graph.nodes.scenario_questions import scenario_questions_node
from app.graph.nodes.closing import closing_node
from app.graph.router import route_interview

def build_interview_graph():
    """
    Constructs and compiles the StateGraph for the AI Recruiter interview session.
    """
    # Create the graph builder
    workflow = StateGraph(InterviewState)
    
    # Register the nodes
    workflow.add_node("greeting", greeting_node)
    workflow.add_node("experience_review", experience_review_node)
    workflow.add_node("technical_questions", technical_questions_node)
    workflow.add_node("scenario_questions", scenario_questions_node)
    workflow.add_node("closing", closing_node)
    
    # Configure the conditional entry point
    workflow.set_conditional_entry_point(
        route_interview,
        {
            "greeting": "greeting",
            "experience_review": "experience_review",
            "technical_questions": "technical_questions",
            "scenario_questions": "scenario_questions",
            "closing": "closing",
            END: END
        }
    )
    
    # Each node transitions directly to END to complete the turn
    for node_name in ["greeting", "experience_review", "technical_questions", "scenario_questions", "closing"]:
        workflow.add_edge(node_name, END)
        
    return workflow.compile()

# Compile the singleton instance
interview_graph = build_interview_graph()
