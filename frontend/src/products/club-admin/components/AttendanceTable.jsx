import React from 'react';

const AttendanceTable = ({ registrations, onUpdateStatus, updating }) => {
    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle shadow-sm">
                <thead className="table-light">
                    <tr>
                        <th scope="col">Student</th>
                        <th scope="col">Email</th>
                        <th scope="col">Registration Date</th>
                        <th scope="col">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {registrations.length === 0 ? (
                        <tr>
                            <td colSpan="4" className="text-center py-4 text-muted">
                                No registrations found for this event.
                            </td>
                        </tr>
                    ) : (
                        registrations.map((reg) => (
                            <tr key={reg.user_id}>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                                            {reg.full_name?.charAt(0).toUpperCase()}
                                        </div>
                                        {reg.full_name}
                                    </div>
                                </td>
                                <td>{reg.email}</td>
                                <td>{new Date(reg.registered_at).toLocaleDateString()}</td>
                                <td>
                                    <select
                                        className={`form-select form-select-sm ${reg.status === 'checked_in' ? 'border-success text-success' :
                                                reg.status === 'absent' ? 'border-danger text-danger' :
                                                    'border-warning text-warning'
                                            }`}
                                        value={reg.status || 'pending'}
                                        onChange={(e) => onUpdateStatus(reg.user_id, e.target.value)}
                                        disabled={updating === reg.user_id}
                                        style={{ width: '140px' }}
                                    >
                                        <option value="pending">⏳ Pending</option>
                                        <option value="checked_in">✅ Checked In</option>
                                        <option value="absent">❌ Absent</option>
                                    </select>
                                    {updating === reg.user_id && <span className="spinner-border spinner-border-sm ms-2 text-primary"></span>}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AttendanceTable;
