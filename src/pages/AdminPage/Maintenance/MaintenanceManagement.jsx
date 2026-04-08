import React, { useMemo, useState, useEffect } from 'react';
import { Row, Col, Card, Avatar, Tag, Button, Input, Select, Divider, Badge, Space, Pagination, message } from 'antd';
import { SearchOutlined, FilePdfOutlined, ClockCircleOutlined, CarOutlined, ExclamationCircleOutlined, CheckCircleOutlined, SyncOutlined, PlayCircleOutlined, CheckOutlined, EyeOutlined, RollbackOutlined } from '@ant-design/icons';
import MaintenanceModal from './MaintenanceModal';
import adminMaintenanceService from '../../../services/adminMaintenanceService';
import adminVehicleService from '../../../services/adminVehicleService';

const { Meta } = Card;
const { Option } = Select;

const primaryColor = '#44624A'; // HOMS green

// localized labels for maintenance types (match modal labels)
const MAINT_TYPE_LABELS = {
	'Oil Change': 'Thay dầu',
	'Tire Replacement': 'Thay lốp',
	'Brake Service': 'Bảo dưỡng phanh',
	'Engine Inspection': 'Kiểm tra động cơ',
	'Preventive Check': 'Kiểm tra phòng ngừa',
	'Repair': 'Sửa chữa',
	'Other': 'Khác'
};

// localized labels for statuses
const STATUS_LABELS = {
	'Scheduled': 'Đã lên lịch',
	'In Progress': 'Đang xử lý',
	'Completed': 'Hoàn thành',
	'Cancelled': 'Đã huỷ'
};

// sample data using MaintenanceSchedule-like plans referencing Vehicle
const sampleVehicles = [
	{
		_id: 'veh-001',
		plateNumber: '29A-12345',
		model: 'ACME Transit Cargo Connect 2015',
		location: 'Số 215, Đường Âu Cơ, Tây Hồ, Hà Nội, Việt Nam',
		odometer: 853,
		engineHours: 989,
		image: null,
		plans: [
			{
				id: 'ms-001',
				maintenanceType: 'Oil Change',
				description: 'Thay dầu động cơ, kiểm tra lọc dầu',
				scheduledStartDate: '2026-06-10',
				scheduledEndDate: '2026-06-11',
				status: 'Scheduled',
				cost: 120000,
				mechanic: { id: 'staff-1', name: 'Nguyễn Văn A' },
				notes: 'Mang dầu chính hãng, kiểm tra rò rỉ',
				attachments: []
			}
		]
	},
	{
		_id: 'veh-002',
		plateNumber: 'ACME-2015',
		model: 'ACME Transit Cargo Connect',
		location: 'Số 470, Đường Lê Duẩn, Quận 1, TP. Hồ Chí Minh, Việt Nam',
		odometer: 68580,
		engineHours: 989,
		image: null,
		plans: [
			{
				id: 'ms-002',
				maintenanceType: 'Tire Replacement',
				description: 'Thay lốp sau trái và phải',
				scheduledStartDate: '2026-05-02',
				scheduledEndDate: '2026-05-02',
				status: 'Completed',
				cost: 2500000,
				mechanic: { id: 'staff-2', name: 'Trần Thị B' },
				notes: 'Thay lốp Michelin',
				attachments: []
			}
		]
	},
	{
		_id: 'veh-003',
		plateNumber: 'BUS-1980',
		model: 'VW Bus 1980',
		location: 'Hà Nội, Việt Nam',
		odometer: 2500,
		engineHours: 250,
		image: null,
		plans: [
			{
				id: 'ms-003',
				maintenanceType: 'Brake Service',
				description: 'Kiểm tra và căn chỉnh phanh',
				scheduledStartDate: '2026-03-01',
				scheduledEndDate: '2026-03-01',
				status: 'In Progress',
				cost: 450000,
				mechanic: { id: 'staff-1', name: 'Nguyễn Văn A' },
				notes: 'Thay má phanh nếu mòn > 50%',
				attachments: []
			}
		]
	}
];

const formatNumber = (v) => new Intl.NumberFormat('vi-VN').format(v || 0);
const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
const milesToKm = (miles) => Math.round((miles || 0) * 1.60934);

export default function MaintenanceManagement() {
	const [modalVisible, setModalVisible] = useState(false);

	const handleCreatePlan = (payload) => {
		// create via API then close modal and append to list
		(async () => {
			try {
				const created = await adminMaintenanceService.createMaintenance(payload);
				console.debug('DEBUG: created response from createMaintenance', created, 'payload', payload);
				// normalize created record
				// include cost and notes from the modal payload so they show immediately in the UI
				const mapped = {
					...created,
					id: created._id,
					vehicle: created.vehicleId,
					cost: typeof payload.cost !== 'undefined' ? payload.cost : (created.cost || 0),
					costDetails: payload.costDetails || created.costDetails || '',
					notes: payload.notes || created.notes || ''
				};
				console.debug('DEBUG: mapped plan to insert into state', mapped);
				setPlans(prev => [mapped, ...prev]);
				// optimistically update cost summary shown in the UI
				setCostSummary(prev => ({
					...prev,
					totalCost: (prev.totalCost || 0) + (mapped.cost || 0),
					totalCount: (prev.totalCount || 0) + 1
				}));
				message.success('Tạo kế hoạch thành công');
				setModalVisible(false);
			} catch (err) {
				console.error(err);
				message.error('Không thể tạo kế hoạch');
			}
		})();
	};
	const [search, setSearch] = useState('');
	const [costSummary, setCostSummary] = useState({ totalCost: 0, totalCount: 0, byStatus: [] });
	const [statusFilter, setStatusFilter] = useState('ALL');
	// hover state for the Create button so we can invert colors on hover
	const [createHover, setCreateHover] = useState(false);

	const [plans, setPlans] = useState([]);

	// vehicles fetched from backend to populate the create modal
	const [vehicles, setVehicles] = useState([]);

	const handleAction = (plan) => {
		// Update status locally for demo purposes. In real app, call API.
		setPlans(prev => prev.map(p => {
			if (p.id !== plan.id) return p;
			const now = new Date().toISOString();
			if (p.status === 'Scheduled') {
				return { ...p, status: 'In Progress', actualStartDate: now };
			}
			if (p.status === 'In Progress') {
				return { ...p, status: 'Completed', actualEndDate: now };
			}
			if (p.status === 'Cancelled') {
				return { ...p, status: 'Scheduled' };
			}
			// Completed or other -> no change
			return p;
		}));
		// show toast (use localized maintenance type)
		const label = plan.status === 'Scheduled' ? 'Bắt đầu' : plan.status === 'In Progress' ? 'Hoàn thành' : plan.status === 'Cancelled' ? 'Khôi phục' : 'Hành động';
		const typeLabel = MAINT_TYPE_LABELS[plan.maintenanceType] || plan.maintenanceType;
		// eslint-disable-next-line no-undef
		try { message.success(`${label}: ${typeLabel}`); } catch (e) { console.log(label, plan); }
	};

	useEffect(() => {
		let mounted = true;
		adminMaintenanceService.getAllMaintenances().then(data => {
			console.debug('DEBUG: raw maintenances from API', data);
			if (!mounted) return;
			const mapped = data.map(p => ({ ...p, id: p._id, vehicle: p.vehicleId }));
			console.debug('DEBUG: mapped maintenances', mapped);
			setPlans(mapped);
		}).catch(err => {
			console.error('Failed to fetch maintenances', err);
		});

		// fetch vehicles for the create modal
		adminVehicleService.getAllVehicles().then(list => {
			if (!mounted) return;
			// normalize to shape expected by the modal (plateNumber, model or vehicleType, _id)
			const normalized = list.map(v => ({
				_id: v.id || v.vehicleId,
				plateNumber: v.licensePlate || v.plateNumber,
				model: v.model || v.type || v.vehicleType || v.type || '',
				...v
			}));
			setVehicles(normalized);
		}).catch(err => {
			console.error('Failed to fetch vehicles', err);
		});
		return () => { mounted = false; };
	}, []);

	// fetch cost summary
	useEffect(() => {
		let mounted = true;
		adminMaintenanceService.getCostSummary().then(s => {
			if (!mounted) return;
			setCostSummary(s || { totalCost: 0, totalCount: 0, byStatus: [] });
		}).catch(err => {
			console.error('Failed to fetch cost summary', err);
		});
		return () => { mounted = false; };
	}, []);

	const filtered = plans.filter(p => {
		if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
		// include plate number alongside model/type (e.g. "1.5TON — 29A-12345") for better search/display
		const vehicleModel = `${p.vehicle?.model || p.vehicle?.type || p.vehicle?.vehicleType || ''}${p.vehicle?.plateNumber ? ' — ' + p.vehicle?.plateNumber : ''}`.trim();
		const plate = p.vehicle?.plateNumber || p.vehicle?.licensePlate || '';
		if (search && !(`${p.maintenanceType} ${p.description || ''} ${vehicleModel} ${plate}`.toLowerCase().includes(search.toLowerCase()))) return false;
		return true;
	});

	// pagination: 3 items per page, client-side
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 3;

	useEffect(() => {
		setCurrentPage(1);
	}, [statusFilter, search]);

	const paginated = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, currentPage]);

	const counts = useMemo(() => ({
	  Scheduled: plans.filter(p => p.status === 'Scheduled').length,
	  InProgress: plans.filter(p => p.status === 'In Progress').length,
	  Completed: plans.filter(p => p.status === 'Completed').length,
	  Cancelled: plans.filter(p => p.status === 'Cancelled').length
	}), [plans]);

		// Small inline SVG bar chart to avoid adding external chart deps
		// This version renders three bars (Overdue, Due, Not Due) with dashed grid lines and nicer spacing
		const StatusSummaryChart = ({ counts }) => {
			const items = [
				{ key: 'Scheduled', label: 'Đã lên lịch', value: counts.Scheduled, color: '#1890ff' },
				{ key: 'InProgress', label: 'Đang xử lý', value: counts.InProgress, color: '#f0ad4e' },
				{ key: 'Completed', label: 'Hoàn thành', value: counts.Completed, color: primaryColor },
				{ key: 'Cancelled', label: 'Đã huỷ', value: counts.Cancelled, color: '#d9534f' }
			];
			const maxValue = Math.max(1, ...items.map(i => i.value));
			// choose a rounded top for the y axis (nearest 5 or 10)
			// compute a nice top and step so we have 4 labelled ticks (top, 3/4, 1/2, 1/4)
			const calcStepAndTop = (maxVal) => {
				// target 4 steps
				const raw = Math.ceil(maxVal / 4);
				// round raw to nearest 5
				const roundTo5 = Math.ceil(raw / 5) * 5;
				const step = Math.max(5, roundTo5);
				const top = step * 4;
				return { step, top };
			};
			// Default Y-axis top is 15. If data increases above 15, compute a larger top.
			const BASE_TOP = 15;
			let step, top;
			if (maxValue <= BASE_TOP) {
				// keep the axis fixed at 15 for small data sets
				top = BASE_TOP;
				// step = top / 4 (rounded up) to create 4 ticks: 0, step, 2*step, 3*step, top
				step = Math.ceil(top / 4);
			} else {
				({ step, top } = calcStepAndTop(maxValue));
			}
			const w = 240;
			const h = 220; // increased height for taller bars
			const padding = { top: 22, right: 12, bottom: 44, left: 28 };
			const chartW = w - padding.left - padding.right;
			const chartH = h - padding.top - padding.bottom;
			const gap = 28;
			const barWidth = Math.max(14, Math.floor((chartW - gap * (items.length - 1)) / items.length));

			return (
				<div style={{ width: w, paddingTop: 12 }}>
					<svg width={w} height={h}>
									{/* horizontal grid lines and left axis labels (ticks) */}
									{/* render 5 ticks including 0: 4*step .. 0 */}
									{[4, 3, 2, 1, 0].map((k) => {
										const val = step * k; // k=4 -> 4*step (top), k=0 -> 0
										const p = top === 0 ? 0 : (val / top);
										const y = padding.top + chartH * (1 - p);
										return (
											<g key={val}>
												<line x1={padding.left} x2={w - padding.right} y1={y} y2={y} stroke="#e6e6e6" strokeWidth={1} strokeDasharray="4 6" />
												<text x={6} y={y + 4} fontSize={11} fill="#999">{val}</text>
											</g>
										);
									})}

						{/* bars */}
						{items.map((it, i) => {
							const x = padding.left + i * (barWidth + gap);
							const barH = Math.round((it.value / top) * chartH);
							const y = padding.top + (chartH - barH);
							return (
								<g key={it.key}>
									<rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={it.color} />
									<text x={x + barWidth / 2} y={y - 8} fontSize={12} textAnchor="middle" fill={it.color} style={{ fontWeight: 700 }}>
										{it.value}
									</text>
									<text x={x + barWidth / 2} y={h - 10} fontSize={12} textAnchor="middle" fill="#333">
										{it.label}
									</text>
								</g>
							);
						})}
					</svg>
				</div>
			);
		};

	return (
		<div style={{ padding: 20 }}>
			<Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
				<Col span={18} style={{ textAlign: 'left' }}>
					<h2 style={{ margin: 0, textAlign: 'left' }}>Bảo trì &amp; Sửa chữa</h2>
				</Col>
				<Col span={6} style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
					<Space align="center" style={{ whiteSpace: 'nowrap' }}>
						<Input.Search placeholder="Tìm kiếm (số xe, tên plan...)" allowClear onSearch={v => setSearch(v)} style={{ width: 200 }} />
						<Button
							style={{
								background: createHover ? primaryColor : '#fff',
								color: createHover ? '#fff' : primaryColor,
								borderColor: primaryColor,
								fontWeight: 700,
								transition: 'all 150ms ease'
							}}
					onMouseEnter={() => setCreateHover(true)}
					onMouseLeave={() => setCreateHover(false)}
					onClick={() => setModalVisible(true)}
					>
						Tạo kế hoạch bảo trì
					</Button>
					</Space>
				</Col>
			</Row>

			{/* Maintenance creation modal */}
			<MaintenanceModal
				visible={modalVisible}
				onCancel={() => setModalVisible(false)}
				onCreate={handleCreatePlan}
				vehicles={vehicles}
				staff={[{ id: 'staff-1', name: 'Nguyễn Văn A' }, { id: 'staff-2', name: 'Trần Thị B' }]}
			/>

			<Row gutter={16} style={{ marginBottom: 18 }}>
				{/* Summary cards - 4 columns */}
				{[
					{
						key: 'scheduled',
						title: 'Đã lên lịch',
						count: counts.Scheduled,
						icon: <ClockCircleOutlined style={{ fontSize: 18, color: '#1890ff' }} />,
						color: '#1890ff',
						bg: '#f0f7ff'
					},
					{
						key: 'inprogress',
						title: 'Đang xử lý',
						count: counts.InProgress,
						icon: <SyncOutlined style={{ fontSize: 18, color: '#f0ad4e' }} />,
						color: '#f0ad4e',
						bg: '#fffaf0'
					},
					{
						key: 'completed',
						title: 'Hoàn thành',
						count: counts.Completed,
						icon: <CheckCircleOutlined style={{ fontSize: 18, color: primaryColor }} />,
						color: primaryColor,
						bg: '#f0fff0'
					},
					{
						key: 'cancelled',
						title: 'Đã huỷ',
						count: counts.Cancelled,
						icon: <ExclamationCircleOutlined style={{ fontSize: 18, color: '#d9534f' }} />,
						color: '#d9534f',
						bg: '#fff5f5'
					}
				].map(card => (
					<Col span={6} key={card.key}>
						<Card
							bodyStyle={{ padding: 16 }}
							style={{
								borderRadius: 12,
								background: card.bg,
								boxShadow: '0 4px 10px rgba(16, 24, 40, 0.03)'
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
									<div style={{
										width: 44,
										height: 44,
										borderRadius: 22,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: '#fff',
										border: `1px solid ${card.color}`
									}}>{card.icon}</div>
									<div>
										<div style={{ fontWeight: 700 }}>{card.title}</div>
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div style={{ fontSize: 20, fontWeight: 800, color: card.color }}>{card.count}</div>
									<div style={{ color: '#666' }}>&nbsp;</div>
								</div>
							</div>
						</Card>
					</Col>
				))}
			</Row>

			<Row gutter={16}>
				<Col span={18}>
					<div>
						{paginated.map(plan => (
							  <Card key={plan.id} bodyStyle={{ textAlign: 'left' }} style={{ marginBottom: 16, borderRadius: 12 }}>
								<Row align="middle">
									<Col span={16}>
										<div style={{ fontSize: 18, fontWeight: 700 }}>{(MAINT_TYPE_LABELS[plan.maintenanceType] || plan.maintenanceType)}{plan.description ? ` — ${plan.description}` : ''}</div>
										<div style={{ color: '#888', marginTop: 6 }}>{new Date(plan.scheduledStartDate).toLocaleDateString()} — {new Date(plan.scheduledEndDate).toLocaleDateString()}</div>

										<div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 12 }}>
											<Avatar size={48} icon={<CarOutlined />} style={{ background: '#eef6ee', color: primaryColor }} />
																							<div>
																									<div style={{ fontWeight: 700 }}>{plan.vehicle?.model || plan.vehicle?.type || (plan.vehicle?.vehicleType ? `${plan.vehicle.vehicleType} — ${plan.vehicle.plateNumber || ''}` : plan.vehicle?.plateNumber) || 'Không có thông tin xe'}</div>
																									{/* Show mechanic, cost and a short notes snippet instead of full address and odometer/hours */}
																									{plan.mechanic && plan.mechanic.name && (
																										<div style={{ color: '#666', marginTop: 4 }}>Thợ: {plan.mechanic.name}</div>
																									)}
																									{/* cost is shown below (from backend or modal) */}
																									<div style={{ color: '#666', marginTop: 6 }}>Chi phí: {formatCurrency(plan.cost)}</div>
																									{plan.costDetails && <div style={{ color: '#777', marginTop: 6, fontSize: 12 }}>{plan.costDetails}</div>}
																									{plan.notes && <div style={{ color: '#999', marginTop: 6, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.notes}</div>}
																							</div>
										</div>
									</Col>

									<Col span={8} style={{ textAlign: 'right' }}>
										<div style={{ marginBottom: 8 }}>
											<div style={{ fontSize: 12, color: '#666' }}>Trạng thái:</div>
											{plan.status === 'Scheduled' ? (
												<Tag color="processing" style={{ fontWeight: 700, marginTop: 6 }}>Đã lên lịch</Tag>
											) : plan.status === 'In Progress' ? (
												<Tag color="warning" style={{ fontWeight: 700, marginTop: 6 }}>Đang xử lý</Tag>
											) : plan.status === 'Completed' ? (
												<Tag color="success" style={{ fontWeight: 700, marginTop: 6 }}>Hoàn thành</Tag>
											) : plan.status === 'Cancelled' ? (
												<Tag color="default" style={{ fontWeight: 700, marginTop: 6 }}>Đã huỷ</Tag>
											) : (
												<Tag style={{ fontWeight: 700, marginTop: 6 }}>{plan.status}</Tag>
											)}
										</div>

										<div style={{ marginTop: 12 }}>
											<Space>
												{/* per-card PDF/export button removed as requested */}
											</Space>
										</div>
									</Col>
								</Row>
							</Card>
						))}
					</div>
				</Col>

				<Col span={6}>
					<Card bodyStyle={{ textAlign: 'left' }} style={{ borderRadius: 8 }}>
						<div style={{ fontWeight: 700, marginBottom: 12 }}>Bộ lọc</div>
						<div style={{ marginBottom: 8 }}>Trạng thái</div>
						<Select value={statusFilter} onChange={v => setStatusFilter(v)} style={{ width: '100%', marginBottom: 12 }}>
							<Option value="ALL">Tất cả</Option>
							<Option value="Scheduled">Đã lên lịch</Option>
							<Option value="In Progress">Đang xử lý</Option>
							<Option value="Completed">Hoàn thành</Option>
							<Option value="Cancelled">Đã huỷ</Option>
						</Select>

						<Divider />
						<div style={{ fontWeight: 700, marginBottom: 8 }}>Tổng chi phí bảo trì</div>
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
							<div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
								<div style={{ fontSize: 24, fontWeight: 900, color: primaryColor }}>{formatCurrency(costSummary.totalCost)}</div>
							</div>
							{/* small stat chips removed per request */}
							{/* breakdown by status */}
							<div style={{ marginTop: 12, width: '100%' }}>
								{(costSummary.byStatus || []).map(s => {
									const colorMap = { 'Scheduled': '#1890ff', 'In Progress': '#f0ad4e', 'Completed': primaryColor, 'Cancelled': '#d9534f' };
									return (
										<div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
												<div style={{ width: 10, height: 10, borderRadius: 6, background: colorMap[s.status] || '#ccc' }} />
												<div style={{ fontSize: 13, color: '#444' }}>{STATUS_LABELS[s.status] || s.status}</div>
											</div>
											<div style={{ textAlign: 'right' }}>
												<div style={{ fontWeight: 800 }}>{formatCurrency(s.totalCost)}</div>
												<div style={{ fontSize: 12, color: '#888' }}>{s.count} kế hoạch</div>
											</div>
										</div>
									);
									})}
							</div>
						</div>

						{/* Status summary chart placed under the cost summary */}
							<div style={{ marginTop: 18 }}>
								<div style={{ fontWeight: 700, marginBottom: 8 }}>Tóm tắt trạng thái</div>
								<StatusSummaryChart counts={counts} />

								{/* pagination for the plans list (3 items per page) shown here inside the right card */}
								<div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
									<Pagination
										current={currentPage}
										pageSize={pageSize}
										total={filtered.length}
										onChange={p => setCurrentPage(p)}
										showSizeChanger={false}
									/>
								</div>
							</div>
					</Card>
				</Col>
			</Row>

		</div>
	);
}

