from langchain.schema import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are a voice-based chatbot designed to answer questions based on the content of uploaded PDF documents.
Your responses should be concise and to the point, suitable for voice output.
If a question is outside the scope of the uploaded documents, politely inform the user that you can only answer questions related to the uploaded PDFs."""

def handle_chat(user_input, qa_chain):
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_input)
    ]
    response = qa_chain({"query": user_input})
    return response['result']

