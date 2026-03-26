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

@police_bp.route('/police/records', methods=['GET'])
def get_police_records():
    tenants = Tenant.query.all()
    result = []
    
    for t in tenants:
        # Related documents
        police_doc = Document.query.filter_by(tenant_id=t.id, type='Police_Form', deleted_at=None).first()
        id_front = Document.query.filter_by(tenant_id=t.id, type='ID_Front', deleted_at=None).first()
        id_back = Document.query.filter_by(tenant_id=t.id, type='ID_Back', deleted_at=None).first()
        
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
            "document_url": t.police_form_url,
            "police_form_url": t.police_form_url,
            "id_card_front_url": t.id_card_front_url,
            "id_card_back_url": t.id_card_back_url,
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
        'ID_Back': 'id_card_back_url'
    }
    
    if doc_type not in valid_types:
        return jsonify({"error": "Invalid document type"}), 400
        
    if file and allowed_file(file.filename):
        # Create base upload dir dynamically in static folder
        base_dir = os.path.join(current_app.root_path, 'static', UPLOAD_FOLDER)
        os.makedirs(base_dir, exist_ok=True)
        
        # Use a more descriptive filename based on type
        ext = file.filename.rsplit('.', 1)[1].lower()
        type_slug = doc_type.lower()
        filename = secure_filename(f"tenant_{tenant_id}_{type_slug}_{int(datetime.now().timestamp())}.{ext}")
        file_path = os.path.join(base_dir, filename)
        
        try:
            file.save(file_path)
            # URL to access from frontend
            file_url = f"/static/{UPLOAD_FOLDER}/{filename}"
            
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
            
            # Update the direct URL field on the Tenant
            attr_name = valid_types[doc_type]
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
        doc.delete()
        
        # Check if there are any other active police forms
        active_forms = Document.query.filter_by(tenant_id=tenant.id, type='Police_Form', deleted_at=None).count()
        if active_forms == 0:
            tenant.police_status = 'Pending'
            tenant.police_form_submitted = None
            tenant.compliance_alert = True
            
        db.session.commit()
        return jsonify({"message": "Police form removed successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
