import os
import uuid
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from pdf_processor import process_pdf
from chat_handler import handle_chat

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

# Ensure the upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

pdf_data = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        pdf_id = str(uuid.uuid4())
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{pdf_id}_{filename}")
        file.save(file_path)
        
        qa_chain = process_pdf(file_path, pdf_id)
        pdf_data[pdf_id] = {
            'filename': filename,
            'qa_chain': qa_chain
        }
        
        return jsonify({'message': 'File uploaded and processed successfully', 'pdf_id': pdf_id}), 200
    else:
        return jsonify({'error': 'Invalid file type. Please upload a PDF.'}), 400

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data['message']
    pdf_id = data['pdf_id']
    
    if pdf_id not in pdf_data:
        return jsonify({'error': 'Invalid PDF ID'}), 400
    
    qa_chain = pdf_data[pdf_id]['qa_chain']
    
    try:
        response = handle_chat(user_input, qa_chain)
        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/pdfs', methods=['GET'])
def get_pdfs():
    return jsonify([{'id': pdf_id, 'filename': data['filename']} for pdf_id, data in pdf_data.items()])

if __name__ == '__main__':
    app.run(debug=True)

