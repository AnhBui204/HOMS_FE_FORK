import api from './api';

export async function getAllMaintenances() {
  try {
    const res = await api.get('/admin/maintenances');
    return res.data;
  } catch (err) {
    console.error('Failed to fetch maintenances', err);
    throw err;
  }
}

export async function createMaintenance(payload) {
  try {
    const res = await api.post('/admin/maintenances', payload);
    return res.data;
  } catch (err) {
    console.error('Failed to create maintenance', err);
    throw err;
  }
}

export async function getCostSummary() {
  try {
    const res = await api.get('/admin/maintenances/summary/cost');
    return res.data;
  } catch (err) {
    console.error('Failed to fetch maintenance cost summary', err);
    throw err;
  }
}

export default { getAllMaintenances, createMaintenance, getCostSummary };
