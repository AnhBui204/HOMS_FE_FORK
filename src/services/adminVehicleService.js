import api from './api';

const transform = (v) => ({
  id: v._id || v.id,
  vehicleId: v.vehicleId,
  type: v.vehicleType,
  status: v.status,
  licensePlate: v.plateNumber || 'N/A',
  capacity: v.loadCapacity || null,
  // FE fields not present on BE yet; defaulted
  currentDriver: v.currentDriver || 'N/A',
  lastMaintenance: v.lastMaintenance || null,
  assigned: v.status === 'InTransit',
});

const adminVehicleService = {
  getAllVehicles: async (params = {}) => {
    try {
      const res = await api.get('/admin/vehicles', { params });
      if (!Array.isArray(res.data)) return [];
      return res.data.map(transform);
    } catch (err) {
      console.error('Error fetching vehicles', err);
      throw err;
    }
  },

  createVehicle: async (payload) => {
    // payload: { licensePlate, type, capacity, lastMaintenance }
    try {
      const body = {
        licensePlate: payload.licensePlate,
        type: payload.type,
        capacity: payload.capacity,
      };
  const res = await api.post('/admin/vehicles', body);
      return transform(res.data);
    } catch (err) {
      console.error('Error creating vehicle', err);
      throw err;
    }
  },

  updateVehicle: async (vehicleId, payload) => {
    try {
      const body = {
        plateNumber: payload.licensePlate,
        vehicleType: payload.type,
        loadCapacity: payload.capacity,
        status: payload.status,
        isActive: payload.isActive,
      };
  const res = await api.put(`/admin/vehicles/${vehicleId}`, body);
      return transform(res.data);
    } catch (err) {
      console.error('Error updating vehicle', err);
      throw err;
    }
  },

  deleteVehicle: async (vehicleId) => {
    try {
  const res = await api.delete(`/admin/vehicles/${vehicleId}`);
      return res.data;
    } catch (err) {
      console.error('Error deleting vehicle', err);
      throw err;
    }
  }
};

export default adminVehicleService;