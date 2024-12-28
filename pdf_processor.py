import os
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def process_pdf(file_path, pdf_id):
    loader = PyMuPDFLoader(file_path)
    documents = loader.load()
    
    text_splitter = CharacterTextSplitter(chunk_size=2000, chunk_overlap=500)
    text_chunks = text_splitter.split_documents(documents)
    
    embedding = HuggingFaceEmbeddings()
    
    persist_directory = f"doc_db_{pdf_id}"
    vectorstore = Chroma.from_documents(
        documents=text_chunks,
        embedding=embedding,
        persist_directory=persist_directory
    )
    
    retriever = vectorstore.as_retriever()
    
    llm = ChatGroq(
        model_name="llama-3.1-8b-instant",
        temperature=0,
        groq_api_key=GROQ_API_KEY
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    
    return qa_chain

