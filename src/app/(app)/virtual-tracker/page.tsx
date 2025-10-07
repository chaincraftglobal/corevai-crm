"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Form,
  Spinner,
  Table,
  Alert,
  Row,
  Col,
} from "react-bootstrap";

type VTAccount = {
  name: string;
  schedule: string;
  lastRunAt?: string;
  result?: string;
  rowsToday?: number;
  emailTo?: string;
  notifyOnRun?: boolean;
  sendOnNoTransactions?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
};

export default function VirtualTrackerPage() {
  const [accounts, setAccounts] = useState<VTAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    username: "",
    password: "",
    schedule: "0 9 * * *",
  });
  const [validatingMap, setValidatingMap] = useState<Record<string, boolean>>({});
  const [deletingMap, setDeletingMap] = useState<Record<string, boolean>>({});

  // Load accounts
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/virtual-tracker/accounts");
      const data = await res.json();
      if (data.ok) setAccounts(data.accounts);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Validate account credentials (per-row)
  const handleValidate = async (name: string) => {
    setValidatingMap((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/api/virtual-tracker/accounts/${name}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        alert(`✅ ${name} authenticated successfully.`);
      } else {
        alert(`❌ ${name} failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert(`❌ ${name} validation failed.`);
    } finally {
      setValidatingMap((prev) => ({ ...prev, [name]: false }));
    }
  };

  // Delete account
  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setDeletingMap((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/api/virtual-tracker/accounts/${name}/delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        alert(`🗑️ ${name} deleted successfully.`);
        await loadAccounts();
      } else {
        alert(`❌ Failed to delete ${name}: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("❌ Network or server error during delete.");
    } finally {
      setDeletingMap((prev) => ({ ...prev, [name]: false }));
    }
  };

  // Create account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/virtual-tracker/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      const data = await res.json();
      if (data.ok) {
        setShowAddModal(false);
        setNewAccount({ name: "", username: "", password: "", schedule: "0 9 * * *" });
        loadAccounts();
      } else {
        alert("❌ Failed to add account.");
      }
    } catch (err) {
      console.error("Error adding account", err);
    }
  };

  return (
    <div className="container mt-4">
      <Row className="align-items-center mb-3">
        <Col>
          <h2>🧠 Virtual Tracker</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            + Add Account
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : accounts.length === 0 ? (
        <Alert variant="info">No accounts yet. Add one to start tracking!</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Account</th>
              <th>Schedule</th>
              <th>Last Run</th>
              <th>Result</th>
              <th>Rows Today</th>
              <th style={{ width: "230px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.name}>
                <td>{acc.name}</td>
                <td>{acc.schedule}</td>
                <td>{acc.lastRunAt || "—"}</td>
                <td>{acc.result || "pending"}</td>
                <td>{acc.rowsToday || 0}</td>
                <td>
                  {/* Validate */}
                  <Button
                    size="sm"
                    variant="success"
                    disabled={validatingMap[acc.name]}
                    onClick={() => handleValidate(acc.name)}
                  >
                    {validatingMap[acc.name] ? (
                      <>
                        <Spinner size="sm" animation="border" /> Validating…
                      </>
                    ) : (
                      "Validate Login"
                    )}
                  </Button>{" "}

                  {/* Settings */}
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => alert("Settings modal to edit account")}
                  >
                    ⚙️
                  </Button>{" "}

                  {/* Delete */}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deletingMap[acc.name]}
                    onClick={() => handleDelete(acc.name)}
                  >
                    {deletingMap[acc.name] ? (
                      <>
                        <Spinner size="sm" animation="border" /> Deleting…
                      </>
                    ) : (
                      "🗑 Delete"
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Account Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddAccount}>
            <Form.Group className="mb-3">
              <Form.Label>Merchant Name</Form.Label>
              <Form.Control
                type="text"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Username / Email</Form.Label>
              <Form.Control
                type="text"
                value={newAccount.username}
                onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={newAccount.password}
                onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Schedule</Form.Label>
              <Form.Select
                value={newAccount.schedule}
                onChange={(e) => setNewAccount({ ...newAccount, schedule: e.target.value })}
              >
                <option value="*/30 * * * *">Every 30 minutes</option>
                <option value="0 * * * *">Every 1 hour</option>
                <option value="0 */3 * * *">Every 3 hours</option>
                <option value="0 9 * * *">Every day at 9 AM</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">
              Add Account
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
