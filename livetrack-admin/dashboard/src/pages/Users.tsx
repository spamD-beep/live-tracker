import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import type { User } from "../types";
import "./Point3.css";

type UserRow = User & {
  manager?: { id: string; fullName: string; email: string } | null;
  _count: { devices: number; reports: number };
};

const roles = ["ADMIN", "MANAGER", "VIEWER", "MOBILE_USER"] as const;

export function Users() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "MOBILE_USER", managerId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ role: "MOBILE_USER", managerId: "" });
  const { data = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then(response => response.data.users as UserRow[])
  });
  const managers = data.filter(user => user.role === "MANAGER" || user.role === "ADMIN");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const createUser = useMutation({
    mutationFn: () => toast.promise(api.post("/users", {
      ...form,
      managerId: form.managerId || null
    }), {
      loading: "Creating user...",
      success: "User created.",
      error: "Unable to create user."
    }),
    onSuccess: () => {
      setForm({ fullName: "", email: "", password: "", role: "MOBILE_USER", managerId: "" });
      setCreateOpen(false);
      refresh();
    }
  });
  const updateUser = useMutation({
    mutationFn: (payload: { id: string; role?: string; managerId?: string | null; isActive?: boolean }) =>
      toast.promise(api.patch(`/users/${payload.id}`, payload), {
        loading: "Updating user...",
        success: "User updated.",
        error: "Unable to update user."
      }),
    onSuccess: () => {
      setEditingUser(null);
      refresh();
    }
  });
  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({ role: user.role, managerId: user.managerId ?? "" });
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">ACCESS CONTROL</span>
          <h1>Users</h1>
          <p>Create employees, assign managers, and control team visibility.</p>
        </div>
        <button className="primary small" onClick={() => setCreateOpen(true)}>Create user</button>
      </div>

      {createOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="create-user-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2 id="create-user-title">Create user</h2>
                <span>Managers can only see employees assigned to them.</span>
              </div>
              <button className="modal-close" aria-label="Close" onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <div className="user-modal-form">
              <label>Full name<input autoFocus placeholder="Full name" value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} /></label>
              <label>Email<input placeholder="name@company.com" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
              <label>Password<input placeholder="At least 8 characters" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
              <label>Role<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>
                {roles.map(role => <option key={role} value={role}>{role}</option>)}
              </select></label>
              <label>Manager<select value={form.managerId} onChange={event => setForm({ ...form, managerId: event.target.value })}>
                <option value="">No manager</option>
                {managers.map(manager => <option key={manager.id} value={manager.id}>{manager.fullName}</option>)}
              </select></label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="primary small" disabled={createUser.isPending || !form.fullName || !form.email || form.password.length < 8} onClick={() => createUser.mutate()}>Create user</button>
            </div>
          </section>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingUser(null)}>
          <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2 id="edit-user-title">Edit user</h2>
                <span>Assign a manager to control team visibility.</span>
              </div>
              <button className="modal-close" aria-label="Close" onClick={() => setEditingUser(null)}>X</button>
            </div>
            <div className="user-modal-form">
              <label>Full name<input value={editingUser.fullName} readOnly /></label>
              <label>Email<input value={editingUser.email} readOnly /></label>
              <label>Role<select value={editForm.role} onChange={event => setEditForm({ ...editForm, role: event.target.value })}>
                {roles.map(role => <option key={role} value={role}>{role}</option>)}
              </select></label>
              <label>Manager<select value={editForm.managerId} onChange={event => setEditForm({ ...editForm, managerId: event.target.value })}>
                <option value="">No manager</option>
                {managers.filter(manager => manager.id !== editingUser.id).map(manager => <option key={manager.id} value={manager.id}>{manager.fullName}</option>)}
              </select></label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditingUser(null)}>Cancel</button>
              <button className="primary small" disabled={updateUser.isPending} onClick={() => updateUser.mutate({ id: editingUser.id, role: editForm.role, managerId: editForm.managerId || null })}>Save changes</button>
            </div>
          </section>
        </div>
      )}

      <section className="table-card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th>Status</th><th>Devices</th><th>Reports</th><th/></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8}>Loading users...</td></tr> : data.map(user => (
              <tr key={user.id}>
                <td><b>{user.fullName}</b></td>
                <td>{user.email}</td>
                <td><span className="text-pill">{user.role}</span></td>
                <td><span className="muted-text">{user.manager?.fullName ?? "No manager"}</span></td>
                <td><button className="link-button" onClick={() => updateUser.mutate({ id: user.id, isActive: !user.isActive })}>{user.isActive ? "Active" : "Disabled"}</button></td>
                <td>{user._count.devices}</td>
                <td>{user._count.reports}</td>
                <td><button className="link-button" onClick={() => openEdit(user)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
