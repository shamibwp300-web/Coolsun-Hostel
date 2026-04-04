import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from backend.models import db, Tenant, Document
from datetime import datetime

police_bp = Blueprint('police', __name__)

# Basic config for file uploads
UPLOAD_FOLDER = 'uploads/documents'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def fix_doc_url(url):
    if not url: return None
    # Ensure it uses the new /api/docs path for reliability
    # Matches /uploads/documents/, static/uploads/documents/, or /static/uploads/documents/
    if 'documents/' in url:
        filename = url.split('/')[-1]
        return f"/api/docs/{filename}"
    return url

@police_bp.route('/police/records', methods=['GET'])
def get_police_records():
    tenants = Tenant.query.all()
    result = []
    
    for t in tenants:
        police_doc = Document.query.filter_by(tenant_id=t.id, type='Police_Form', deleted_at=None).order_by(Document.id.desc()).first()
        id_front = Document.query.filter_by(tenant_id=t.id, type='ID_Front', deleted_at=None).order_by(Document.id.desc()).first()
        id_back = Document.query.filter_by(tenant_id=t.id, type='ID_Back', deleted_at=None).order_by(Document.id.desc()).first()
        agreement = Document.query.filter_by(tenant_id=t.id, type='Agreement', deleted_at=None).order_by(Document.id.desc()).first()
        
        result.append({
            "id": t.id,
            "name": t.name,
            "cnic": t.cnic,
            "phone": t.phone,
            "room_number": t.room.number if t.room else "N/A",
            "police_status": t.police_status,
            "father_name": t.father_name,
            "permanent_address": t.permanent_address,
            "police_station": t.police_station,
            "document_url": fix_doc_url(police_doc.url) if police_doc else fix_doc_url(t.police_form_url),
            "document_id": police_doc.id if police_doc else None,
            "police_form_url": fix_doc_url(police_doc.url) if police_doc else fix_doc_url(t.police_form_url),
            "police_form_id": police_doc.id if police_doc else None,
            "id_card_front_url": fix_doc_url(id_front.url) if id_front else fix_doc_url(t.id_card_front_url),
            "id_card_front_id": id_front.id if id_front else None,
            "id_card_back_url": fix_doc_url(id_back.url) if id_back else fix_doc_url(t.id_card_back_url),
            "id_card_back_id": id_back.id if id_back else None,
            "agreement_url": fix_doc_url(agreement.url) if agreement else None,
            "agreement_id": agreement.id if agreement else None,
            "submitted_at": t.police_form_submitted.isoformat() if t.police_form_submitted else None
        })
        
    return jsonify(result), 200

@police_bp.route('/police/records/<int:tenant_id>', methods=['PUT'])
def update_police_record(tenant_id):
    tenant = Tenant.query.get_or_404(tenant_id)
    data = request.json
    
    try:
        tenant.father_name = data.get('father_name', tenant.father_name)
        tenant.permanent_address = data.get('permanent_address', tenant.permanent_address)
        tenant.police_station = data.get('police_station', tenant.police_station)
        
        # Admin specifically overrides status
        if 'police_status' in data:
            tenant.police_status = data['police_status']
            if data['police_status'] == 'Verified':
                tenant.compliance_alert = False
        
        db.session.commit()
        return jsonify({"message": "Police record updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@police_bp.route('/police/upload/<int:tenant_id>', methods=['POST'])
def upload_police_form(tenant_id):
    tenant = Tenant.query.get_or_404(tenant_id)
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Optional doc type (default to Police_Form for backward compatibility)
    doc_type = request.form.get('type', 'Police_Form')
    # Validate type
    valid_types = {
        'Police_Form': 'police_form_url',
        'ID_Front': 'id_card_front_url',
        'ID_Back': 'id_card_back_url',
        'Agreement': 'agreement_url'
    }
    
    if doc_type not in valid_types:
        return jsonify({"error": "Invalid document type"}), 400
        
    if file and allowed_file(file.filename):
        # Save file to the persistent upload directory
        base_dir = current_app.config['UPLOAD_FOLDER']
        os.makedirs(base_dir, exist_ok=True)
        
        # Use a more descriptive filename based on type
        ext = file.filename.rsplit('.', 1)[1].lower()
        type_slug = doc_type.lower()
        filename = secure_filename(f"tenant_{tenant_id}_{type_slug}_{int(datetime.now().timestamp())}.{ext}")
        file_path = os.path.join(base_dir, filename)
        
        try:
            file.save(file_path)
            # URL to access from frontend
            file_url = f"/api/docs/{filename}"
            
            # Deactivate previous docs of same type
            old_docs = Document.query.filter_by(tenant_id=tenant_id, type=doc_type, deleted_at=None).all()
            for old in old_docs:
                old.delete()
                
            new_doc = Document(
                tenant_id=tenant.id,
                type=doc_type,
                url=file_url
            )
            db.session.add(new_doc)
            
            # Update the direct URL field on the Tenant if applicable
            attr_name = valid_types[doc_type]
            if attr_name:
                setattr(tenant, attr_name, file_url)
            
            if doc_type == 'Police_Form':
                tenant.police_status = 'Submitted'
                tenant.police_form_submitted = datetime.utcnow()
                tenant.compliance_alert = False
            
            db.session.commit()
            return jsonify({
                "message": f"{doc_type} uploaded successfully",
                "document_url": file_url,
                "document_id": new_doc.id
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "File type not allowed"}), 400

@police_bp.route('/police/upload/<int:document_id>', methods=['DELETE'])
def delete_police_form(document_id):
    doc = Document.query.get_or_404(document_id)
    tenant = Tenant.query.get(doc.tenant_id)
    
    try:
        doc_type = doc.type
        doc.delete()
        
        # Clear the model field if necessary
        if doc_type == 'ID_Front':
            tenant.id_card_front_url = None
        elif doc_type == 'ID_Back':
            tenant.id_card_back_url = None
        elif doc_type == 'Police_Form':
            # Check if there are any other active police forms
            active_forms = Document.query.filter_by(tenant_id=tenant.id, type='Police_Form', deleted_at=None).count()
            if active_forms == 0:
                tenant.police_status = 'Pending'
                tenant.police_form_submitted = None
                tenant.compliance_alert = True
                tenant.police_form_url = None
            
        db.session.commit()
        return jsonify({"message": f"{doc_type} removed successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
