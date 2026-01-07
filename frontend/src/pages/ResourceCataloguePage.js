import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import resourceCategoryService from '../services/resourceCategoryService';
import resourceTypeService from '../services/resourceTypeService';
import './ResourceCataloguePage.css';

const ResourceCataloguePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Categories state
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]); // Store all categories for client-side filtering
  const [categoryFilters, setCategoryFilters] = useState({
    status: 'active',
    search: ''
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Types state
  const [types, setTypes] = useState([]);
  const [allTypes, setAllTypes] = useState([]); // Store all types for client-side filtering
  const [typeFilters, setTypeFilters] = useState({
    category_id: '',
    status: 'active',
    search: ''
  });

  // Category modal state
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  // Type modal state
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [typeFormData, setTypeFormData] = useState({
    category_id: '',
    code: '',
    name: '',
    description: '',
    total_quantity: 0,
    available_quantity: 0,
    unit: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filtering for categories when search/status changes
  useEffect(() => {
    const filtered = allCategories.filter(category =>
      (categoryFilters.status === '' || category.status === categoryFilters.status) &&
      (categoryFilters.search === '' ||
        category.name.toLowerCase().includes(categoryFilters.search.toLowerCase()) ||
        category.code.toLowerCase().includes(categoryFilters.search.toLowerCase()))
    );
    setCategories(filtered);
  }, [allCategories, categoryFilters]);

  // Client-side filtering for types when search/status/category changes
  useEffect(() => {
    let filtered = allTypes.filter(type =>
      (typeFilters.status === '' || type.status === typeFilters.status) &&
      (typeFilters.search === '' ||
        type.name.toLowerCase().includes(typeFilters.search.toLowerCase()) ||
        type.code.toLowerCase().includes(typeFilters.search.toLowerCase()))
    );

    // Apply category filter
    if (selectedCategoryId) {
      filtered = filtered.filter(type => type.category_id === selectedCategoryId);
    } else if (typeFilters.category_id) {
      filtered = filtered.filter(type => type.category_id === typeFilters.category_id);
    }

    setTypes(filtered);
  }, [selectedCategoryId, allTypes, typeFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'administrator') {
        setError('Access denied. Only administrators can manage resources.');
        setLoading(false);
        return;
      }

      // Load all categories and types for client-side filtering
      const [categoriesData, typesData] = await Promise.all([
        resourceCategoryService.getAllCategories({}),
        resourceTypeService.getAllTypes({})
      ]);

      setAllCategories(categoriesData);
      setAllTypes(typesData);

      setLoading(false);
    } catch (err) {
      console.error('Error loading resources:', err);
      setError(err.response?.data?.error || 'Failed to load resources');
      setLoading(false);
    }
  };

  // ========================================
  // Category Handlers
  // ========================================

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      await resourceCategoryService.createCategory(categoryFormData);
      setSuccess('Category created successfully!');
      setShowCreateCategoryModal(false);
      setCategoryFormData({ code: '', name: '', description: '' });
      loadData();
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.response?.data?.error || 'Failed to create category');
    }
  };

  const handleEditCategoryClick = (category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      code: category.code,
      name: category.name,
      description: category.description || ''
    });
    setShowEditCategoryModal(true);
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      await resourceCategoryService.updateCategory(selectedCategory.id, categoryFormData);
      setSuccess('Category updated successfully!');
      setShowEditCategoryModal(false);
      setSelectedCategory(null);
      setCategoryFormData({ code: '', name: '', description: '' });
      loadData();
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err.response?.data?.error || 'Failed to update category');
    }
  };

  const handleToggleCategoryStatus = async (category) => {
    try {
      setError('');
      setSuccess('');

      const newStatus = category.status === 'active' ? 'inactive' : 'active';
      await resourceCategoryService.updateCategoryStatus(category.id, newStatus);
      setSuccess(`Category ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error toggling category status:', err);
      setError(err.response?.data?.error || 'Failed to update category status');
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(categoryId);
  };

  // ========================================
  // Type Handlers
  // ========================================

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      await resourceTypeService.createType(typeFormData);
      setSuccess('Resource type created successfully!');
      setShowCreateTypeModal(false);
      setTypeFormData({
        category_id: '',
        code: '',
        name: '',
        description: '',
        total_quantity: 0,
        available_quantity: 0,
        unit: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      console.error('Error creating resource type:', err);
      setError(err.response?.data?.error || 'Failed to create resource type');
    }
  };

  const handleEditTypeClick = (type) => {
    setSelectedType(type);
    setTypeFormData({
      category_id: type.category_id,
      code: type.code,
      name: type.name,
      description: type.description || '',
      total_quantity: type.total_quantity,
      available_quantity: type.available_quantity,
      unit: type.unit || '',
      notes: type.notes || ''
    });
    setShowEditTypeModal(true);
  };

  const handleEditType = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      await resourceTypeService.updateType(selectedType.id, typeFormData);
      setSuccess('Resource type updated successfully!');
      setShowEditTypeModal(false);
      setSelectedType(null);
      setTypeFormData({
        category_id: '',
        code: '',
        name: '',
        description: '',
        total_quantity: 0,
        available_quantity: 0,
        unit: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      console.error('Error updating resource type:', err);
      setError(err.response?.data?.error || 'Failed to update resource type');
    }
  };

  const handleToggleTypeStatus = async (type) => {
    try {
      setError('');
      setSuccess('');

      const newStatus = type.status === 'active' ? 'inactive' : 'active';
      await resourceTypeService.updateTypeStatus(type.id, newStatus);
      setSuccess(`Resource type ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error toggling resource type status:', err);
      setError(err.response?.data?.error || 'Failed to update resource type status');
    }
  };

  if (loading) return <div className="resource-catalogue-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="resource-catalogue-container">
      <div className="page-header">
        <div>
          <h1>📦 Resource Catalogue</h1>
          <p>Manage resource categories and types for event bookings</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="resource-sections">
        {/* ======================================== */}
        {/* Resource Categories Section - LEFT SIDE */}
        {/* ======================================== */}
        <div className="resource-section categories-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Categories</h2>
              <span className="section-count">({categories.length})</span>
            </div>
            <div className="header-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateCategoryModal(true)}
              >
                + New
              </button>
            </div>
          </div>

          <div className="section-filters">
            <input
              type="text"
              placeholder="Search categories..."
              value={categoryFilters.search}
              onChange={(e) => setCategoryFilters({ ...categoryFilters, search: e.target.value })}
              className="search-input"
            />
            <select
              value={categoryFilters.status}
              onChange={(e) => setCategoryFilters({ ...categoryFilters, status: e.target.value })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="categories-list">
            {categories.length === 0 ? (
              <p className="no-data">No categories found</p>
            ) : (
              <div className="category-cards">
                {categories.map((category) => (
                  <div 
                    key={category.id} 
                    className={`category-card ${selectedCategoryId === category.id ? 'selected' : ''} ${category.status}`}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <div className="category-card-header">
                      <div className="category-info">
                        <code className="category-code">{category.code}</code>
                        <h3 className="category-name">{category.name}</h3>
                      </div>
                      <span className={`status-badge ${category.status}`}>
                        {category.status}
                      </span>
                    </div>
                    {category.description && (
                      <p className="category-description">{category.description}</p>
                    )}
                    <div className="category-footer">
                      <span className="type-count">{category.type_count || 0} types</span>
                      <div className="category-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn-edit" 
                          onClick={() => handleEditCategoryClick(category)}
                          title="Edit category"
                        >
                          ✏️
                        </button>
                        <button
                          className={`btn-status ${category.status === 'active' ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleCategoryStatus(category)}
                          title={category.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {category.status === 'active' ? '🚫' : '✅'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ======================================== */}
        {/* Resource Types Section - RIGHT SIDE */}
        {/* ======================================== */}
        <div className="resource-section types-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Resource Types</h2>
              <span className="section-count">({types.length})</span>
              {selectedCategoryId && (
                <span className="filter-indicator">
                  (filtered by category)
                </span>
              )}
            </div>
            <div className="header-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setTypeFormData({
                    category_id: selectedCategoryId || '',
                    code: '',
                    name: '',
                    description: '',
                    total_quantity: 0,
                    available_quantity: 0,
                    unit: '',
                    notes: ''
                  });
                  setShowCreateTypeModal(true);
                }}
              >
                + New Type
              </button>
            </div>
          </div>

          <div className="section-filters">
            <input
              type="text"
              placeholder="Search resource types..."
              value={typeFilters.search}
              onChange={(e) => setTypeFilters({ ...typeFilters, search: e.target.value })}
              className="search-input"
            />
            {!selectedCategoryId && (
              <select
                value={typeFilters.category_id}
                onChange={(e) => setTypeFilters({ ...typeFilters, category_id: e.target.value })}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {categories.filter(c => c.status === 'active').map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            )}
            <select
              value={typeFilters.status}
              onChange={(e) => setTypeFilters({ ...typeFilters, status: e.target.value })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {selectedCategoryId && (
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedCategoryId(null)}
                title="Clear category filter"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="types-list">
            {types.length === 0 ? (
              <p className="no-data">No resource types found</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((type) => (
                    <tr key={type.id}>
                      <td><code>{type.code}</code></td>
                      <td>{type.name}</td>
                      <td>
                        <span className="category-badge">{type.category_name}</span>
                      </td>
                      <td>{type.available_quantity} / {type.total_quantity}</td>
                      <td>{type.unit || '-'}</td>
                      <td>
                        <span className={`status-badge ${type.status}`}>
                          {type.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-edit" 
                            onClick={() => handleEditTypeClick(type)}
                            title="Edit resource type"
                          >
                            ✏️
                          </button>
                          <button
                            className={`btn-status ${type.status === 'active' ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleTypeStatus(type)}
                            title={type.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {type.status === 'active' ? '🚫' : '✅'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ======================================== */}
      {/* Category Create Modal */}
      {/* ======================================== */}
      {showCreateCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCreateCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Category</h2>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label>Category Code *</label>
                <input
                  type="text"
                  value={categoryFormData.code}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., AV, IT, FURN"
                  required
                  maxLength={10}
                />
                <small>2-10 uppercase alphanumeric characters</small>
              </div>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g., Audio Visual Equipment"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* Category Edit Modal */}
      {/* ======================================== */}
      {showEditCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowEditCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Category</h2>
            <form onSubmit={handleEditCategory}>
              <div className="form-group">
                <label>Category Code *</label>
                <input
                  type="text"
                  value={categoryFormData.code}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* Type Create Modal */}
      {/* ======================================== */}
      {showCreateTypeModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Resource Type</h2>
            <form onSubmit={handleCreateType}>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={typeFormData.category_id}
                  onChange={(e) => setTypeFormData({ ...typeFormData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.filter(c => c.status === 'active').map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Resource Code *</label>
                <input
                  type="text"
                  value={typeFormData.code}
                  onChange={(e) => setTypeFormData({ ...typeFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., PROJ-HD, MIC-WL"
                  required
                  maxLength={20}
                />
                <small>2-20 uppercase alphanumeric characters (hyphens allowed)</small>
              </div>
              <div className="form-group">
                <label>Resource Name *</label>
                <input
                  type="text"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  placeholder="e.g., HD Projector, Wireless Microphone"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  placeholder="Brief description of this resource type"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Quantity *</label>
                  <input
                    type="number"
                    value={typeFormData.total_quantity}
                    onChange={(e) => setTypeFormData({ ...typeFormData, total_quantity: parseInt(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Available Quantity *</label>
                  <input
                    type="number"
                    value={typeFormData.available_quantity}
                    onChange={(e) => setTypeFormData({ ...typeFormData, available_quantity: parseInt(e.target.value) })}
                    min="0"
                    max={typeFormData.total_quantity}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    value={typeFormData.unit}
                    onChange={(e) => setTypeFormData({ ...typeFormData, unit: e.target.value })}
                    placeholder="e.g., pieces, sets, units"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={typeFormData.notes}
                  onChange={(e) => setTypeFormData({ ...typeFormData, notes: e.target.value })}
                  placeholder="Usage restrictions, special instructions, etc."
                  rows={2}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTypeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Resource Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* Type Edit Modal */}
      {/* ======================================== */}
      {showEditTypeModal && (
        <div className="modal-overlay" onClick={() => setShowEditTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Resource Type</h2>
            <form onSubmit={handleEditType}>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={typeFormData.category_id}
                  onChange={(e) => setTypeFormData({ ...typeFormData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.filter(c => c.status === 'active').map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Resource Code *</label>
                <input
                  type="text"
                  value={typeFormData.code}
                  onChange={(e) => setTypeFormData({ ...typeFormData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength={20}
                />
              </div>
              <div className="form-group">
                <label>Resource Name *</label>
                <input
                  type="text"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Quantity *</label>
                  <input
                    type="number"
                    value={typeFormData.total_quantity}
                    onChange={(e) => setTypeFormData({ ...typeFormData, total_quantity: parseInt(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Available Quantity *</label>
                  <input
                    type="number"
                    value={typeFormData.available_quantity}
                    onChange={(e) => setTypeFormData({ ...typeFormData, available_quantity: parseInt(e.target.value) })}
                    min="0"
                    max={typeFormData.total_quantity}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    value={typeFormData.unit}
                    onChange={(e) => setTypeFormData({ ...typeFormData, unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={typeFormData.notes}
                  onChange={(e) => setTypeFormData({ ...typeFormData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditTypeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Resource Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceCataloguePage;
