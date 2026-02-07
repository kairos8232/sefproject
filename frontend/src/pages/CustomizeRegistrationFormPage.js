import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import registrationFieldService from '../services/registrationFieldService';
import eventService from '../services/eventService';
import authService from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import './CustomizeRegistrationFormPage.css';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: '📝' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'dropdown', label: 'Dropdown', icon: '▼' },
  { value: 'radio', label: 'Multiple Choice', icon: '◉' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑️' }
];

function CustomizeRegistrationFormPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const currentUser = authService.getCurrentUser();
  const accessDeniedShownRef = useRef(false);
  
  const [event, setEvent] = useState(null);
  const [fields, setFields] = useState([]);
  const [hasRegistrations, setHasRegistrations] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Form data for new/edit field
  const [fieldForm, setFieldForm] = useState({
    field_type: 'text',
    label: '',
    help_text: '',
    is_required: false,
    options: [''],
    validation_rules: {}
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventData, fieldsData] = await Promise.all([
        eventService.getEventById(eventId),
        registrationFieldService.getEventFields(eventId)
      ]);
      
      setEvent(eventData.event);
      setFields(fieldsData.fields || []);
      setHasRegistrations(fieldsData.hasRegistrations || false);
      setCanEdit(fieldsData.canEdit !== false);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [eventId, showError]);

  useEffect(() => {
    document.title = 'Customize Registration Form - CESMS';
    loadData();
  }, [loadData]);

  const handleAddField = () => {
    setFieldForm({
      field_type: 'text',
      label: '',
      help_text: '',
      is_required: false,
      options: [''],
      validation_rules: {}
    });
    setEditingField(null);
    setShowAddModal(true);
  };

  const handleEditField = (field) => {
    setFieldForm({
      field_type: field.field_type,
      label: field.label,
      help_text: field.help_text || '',
      is_required: field.is_required,
      options: field.options || [''],
      validation_rules: field.validation_rules || {}
    });
    setEditingField(field);
    setShowAddModal(true);
  };

  const handleSaveField = async () => {
    try {
      if (!fieldForm.label.trim()) {
        showError('Field label is required');
        return;
      }

      // Validate options for choice fields
      if (['dropdown', 'radio', 'checkbox'].includes(fieldForm.field_type)) {
        const validOptions = fieldForm.options.filter(opt => opt.trim());
        if (validOptions.length === 0) {
          showError('At least one option is required for this field type');
          return;
        }
        // Create a new object to avoid mutation
        const updatedForm = { ...fieldForm, options: validOptions };
        
        if (editingField) {
          await registrationFieldService.updateField(eventId, editingField.id, updatedForm);
          showSuccess('Field updated successfully');
        } else {
          await registrationFieldService.createField(eventId, updatedForm);
          showSuccess('Field added successfully');
        }
      } else {
        if (editingField) {
          await registrationFieldService.updateField(eventId, editingField.id, fieldForm);
          showSuccess('Field updated successfully');
        } else {
          await registrationFieldService.createField(eventId, fieldForm);
          showSuccess('Field added successfully');
        }
      }
      
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to save field');
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!window.confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      await registrationFieldService.deleteField(eventId, fieldId);
      showSuccess('Field deleted successfully');
      await loadData();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to delete field');
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);
    
    setFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      // Update order_index for all fields
      const fieldOrders = fields.map((field, index) => ({
        id: field.id,
        order_index: index
      }));

      await registrationFieldService.reorderFields(eventId, fieldOrders);
      setDraggedIndex(null);
    } catch (err) {
      showError('Failed to reorder fields');
      await loadData(); // Reload to reset order
    }
  };

  const addOption = () => {
    setFieldForm({
      ...fieldForm,
      options: [...fieldForm.options, '']
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...fieldForm.options];
    newOptions[index] = value;
    setFieldForm({ ...fieldForm, options: newOptions });
  };

  const removeOption = (index) => {
    if (fieldForm.options.length <= 1) return;
    const newOptions = fieldForm.options.filter((_, i) => i !== index);
    setFieldForm({ ...fieldForm, options: newOptions });
  };

  const renderFieldPreview = (field) => {
    const commonProps = {
      placeholder: field.label,
      disabled: true
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return <input type={field.field_type === 'text' ? 'text' : field.field_type} {...commonProps} />;
      
      case 'textarea':
        return <textarea {...commonProps} rows="3" />;
      
      case 'number':
        return <input type="number" {...commonProps} />;
      
      case 'date':
        return <input type="date" {...commonProps} />;
      
      case 'dropdown':
        return (
          <select disabled>
            <option>Select...</option>
            {field.options && field.options.map((opt, i) => (
              <option key={i}>{opt}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="crf-preview-options">
            {field.options && field.options.map((opt, i) => (
              <label key={i} className="crf-preview-option">
                <input type="radio" name={field.id} disabled /> {opt}
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="crf-preview-options">
            {field.options && field.options.map((opt, i) => (
              <label key={i} className="crf-preview-option">
                <input type="checkbox" disabled /> {opt}
              </label>
            ))}
          </div>
        );
      
      default:
        return <input type="text" {...commonProps} />;
    }
  };

  if (loading) {
    return <div className="crf-customize-form-page"><div className="crf-loading">Loading...</div></div>;
  }

  // Restrict access to event_organizer role only
  if (currentUser?.role !== 'event_organizer' && currentUser?.role !== 'administrator') {
    if (!accessDeniedShownRef.current) {
      showError('Access denied. Only event organizers and administrators can customize registration forms.');
      accessDeniedShownRef.current = true;
    }
    return (
      <div className="crf-customize-form-page">
        <button onClick={() => navigate('/my-events')} className="crf-back-button" style={{ marginTop: '20px' }}>
          Back to My Events
        </button>
      </div>
    );
  }

  return (
    <div className="crf-customize-form-page">
      <div className="crf-page-header">
        <div className="crf-header-content">
          <h1>Customize Registration Form</h1>
          <p>{event?.event_name}</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="crf-back-button">
          Back to My Events
        </button>
      </div>

      {hasRegistrations && (
        <div className="crf-info-message">
          ⓘ This event has registrations. You cannot add, edit, or delete fields. You can only view the form and reorder fields.
        </div>
      )}

      <div className="crf-form-builder-container">
        {/* Left Panel - Field Builder */}
        <div className="crf-builder-panel">
          <div className="crf-panel-header">
            <h2>Form Fields</h2>
            {canEdit && (
              <button onClick={handleAddField} className="crf-add-field-button">
                + Add Field
              </button>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="crf-empty-state">
              <p>No custom fields yet</p>
              <p className="crf-empty-hint">Click "Add Field" to create your first custom field</p>
            </div>
          ) : (
            <div className="crf-fields-list">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`crf-field-item ${draggedIndex === index ? 'crf-dragging' : ''}`}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="crf-field-drag-handle">☰</div>
                  <div className="crf-field-info">
                    <div className="crf-field-label">
                      {field.label}
                      {field.is_required && <span className="crf-required-badge">Required</span>}
                    </div>
                    <div className="crf-field-type">
                      {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="crf-field-actions">
                      <button onClick={() => handleEditField(field)} className="crf-edit-button">
                        ✏️
                      </button>
                      <button onClick={() => handleDeleteField(field.id)} className="crf-delete-button">
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="crf-preview-panel">
          <div className="crf-panel-header">
            <h2>Preview</h2>
          </div>
          <div className="crf-preview-content">
            <div className="crf-preview-form">
              {fields.length === 0 ? (
                <p className="crf-preview-empty">No custom fields to preview</p>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="crf-preview-field">
                    <label>
                      {field.label}
                      {field.is_required && <span className="crf-required-star">*</span>}
                    </label>
                    {field.help_text && <p className="crf-preview-help-text">{field.help_text}</p>}
                    {renderFieldPreview(field)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Field Modal */}
      {showAddModal && (
        <div className="crf-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="crf-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingField ? 'Edit Field' : 'Add New Field'}</h2>
            
            <div className="crf-form-group">
              <label>Field Type *</label>
              <div className="crf-field-type-grid">
                {FIELD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    className={`crf-field-type-option ${fieldForm.field_type === type.value ? 'crf-selected' : ''}`}
                    onClick={() => setFieldForm({ ...fieldForm, field_type: type.value })}
                  >
                    <span className="crf-type-icon">{type.icon}</span>
                    <span className="crf-type-label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="crf-form-group">
              <label>Field Label *</label>
              <input
                type="text"
                value={fieldForm.label}
                onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                placeholder="e.g., T-Shirt Size, Dietary Requirements"
              />
            </div>

            <div className="crf-form-group">
              <label>Help Text (optional)</label>
              <input
                type="text"
                value={fieldForm.help_text}
                onChange={(e) => setFieldForm({ ...fieldForm, help_text: e.target.value })}
                placeholder="Additional instructions for participants"
              />
            </div>

            <div className="crf-form-group">
              <label className="crf-checkbox-label">
                <input
                  type="checkbox"
                  checked={fieldForm.is_required}
                  onChange={(e) => setFieldForm({ ...fieldForm, is_required: e.target.checked })}
                />
                Required field
              </label>
            </div>

            {/* Validation Rules */}
            {['text', 'textarea', 'email', 'phone'].includes(fieldForm.field_type) && (
              <div className="crf-form-group">
                <label>Validation Rules (optional)</label>
                <div className="crf-validation-inputs">
                  <div className="crf-validation-row">
                    <label>Min Length:</label>
                    <input
                      type="number"
                      min="0"
                      value={fieldForm.validation_rules.minLength || ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 3"
                    />
                  </div>
                  <div className="crf-validation-row">
                    <label>Max Length:</label>
                    <input
                      type="number"
                      min="0"
                      value={fieldForm.validation_rules.maxLength || ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="crf-validation-row">
                    <label>Pattern (regex):</label>
                    <input
                      type="text"
                      value={fieldForm.validation_rules.pattern || ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, pattern: e.target.value || undefined }
                      })}
                      placeholder="e.g., ^[A-Z]{3}\d{6}$"
                    />
                  </div>
                  <div className="crf-validation-row">
                    <label>Custom Error Message:</label>
                    <input
                      type="text"
                      value={fieldForm.validation_rules.message || ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, message: e.target.value || undefined }
                      })}
                      placeholder="e.g., Must be 3 letters + 6 digits"
                    />
                  </div>
                </div>
              </div>
            )}

            {fieldForm.field_type === 'number' && (
              <div className="crf-form-group">
                <label>Validation Rules (optional)</label>
                <div className="crf-validation-inputs">
                  <div className="crf-validation-row">
                    <label>Minimum Value:</label>
                    <input
                      type="number"
                      value={fieldForm.validation_rules.min !== undefined ? fieldForm.validation_rules.min : ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, min: e.target.value !== '' ? parseFloat(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 0"
                    />
                  </div>
                  <div className="crf-validation-row">
                    <label>Maximum Value:</label>
                    <input
                      type="number"
                      value={fieldForm.validation_rules.max !== undefined ? fieldForm.validation_rules.max : ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, max: e.target.value !== '' ? parseFloat(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>
            )}

            {fieldForm.field_type === 'checkbox' && (
              <div className="crf-form-group">
                <label>Validation Rules (optional)</label>
                <div className="crf-validation-inputs">
                  <div className="crf-validation-row">
                    <label>Min Selections:</label>
                    <input
                      type="number"
                      min="0"
                      value={fieldForm.validation_rules.minItems || ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, minItems: e.target.value ? parseInt(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div className="crf-validation-row">
                    <label>Max Selections:</label>
                    <input
                      type="number"
                      min="0"
                      value={fieldForm.validation_rules.maxItems || ''}
                      onChange={(e) => setFieldForm({
                        ...fieldForm,
                        validation_rules: { ...fieldForm.validation_rules, maxItems: e.target.value ? parseInt(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 3"
                    />
                  </div>
                </div>
              </div>
            )}

            {['dropdown', 'radio', 'checkbox'].includes(fieldForm.field_type) && (
              <div className="crf-form-group">
                <label>Options *</label>
                {fieldForm.options.map((option, index) => (
                  <div key={index} className="crf-option-input-group">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {fieldForm.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="crf-remove-option-button">
                        ❌
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addOption} className="crf-add-option-button">
                  + Add Option
                </button>
              </div>
            )}

            <div className="crf-modal-actions">
              <button type="button" onClick={() => setShowAddModal(false)} className="crf-cancel-button">
                Cancel
              </button>
              <button type="button" onClick={handleSaveField} className="crf-save-button">
                {editingField ? 'Update Field' : 'Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomizeRegistrationFormPage;
