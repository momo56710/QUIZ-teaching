import { Button, Typography, Space, Avatar, Card, Divider } from "antd";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router";
import { ref, set, remove } from "firebase/database";
import { database } from "../config/firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "antd/dist/reset.css";
import { useEffect } from "react";
import LeaderboardPodium from "../components/LeaderboardPodium";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { Title, Text } = Typography;

  // Add user to active users when component mounts
  useEffect(() => {
    if (user) {
      const activeUsersRef = ref(database, `activeUsers/${user.uid}`);
      set(activeUsersRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        joinedAt: Date.now(),
      });

      // Remove user from active users when component unmounts
      return () => {
        remove(activeUsersRef);
      };
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      // Remove user from active users
      if (user) {
        const activeUsersRef = ref(database, `activeUsers/${user.uid}`);
        await remove(activeUsersRef);
      }

      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleJoinQuiz = async () => {
    if (!user) return;

    try {
      // Add user to active users
      const activeUsersRef = ref(database, `activeUsers/${user.uid}`);
      await set(activeUsersRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        joinedAt: Date.now(),
      });

      // Navigate to quiz waiting room
      navigate("/quiz/waiting");
    } catch (error) {
      toast.error("Failed to join quiz", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleAdminAccess = () => {
    navigate("/admin/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px",
        background: "#f0f2f5",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Main Content */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
            <div style={{ width: "100%", maxWidth: "600px" }}>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <Title level={1} style={{ marginBottom: "16px" }}>
                    Welcome to Quiz App
                  </Title>
                  <Text type="secondary" style={{ fontSize: "16px" }}>
                    You are successfully logged in!
                  </Text>
                </div>

                {user && (
                  <Card style={{ textAlign: "center" }}>
                    <Space direction="vertical" size="middle">
                      <Avatar size={80} src={user.photoURL || undefined}>
                        {user.displayName?.[0] || user.email?.[0]}
                      </Avatar>
                      <div>
                        <Title level={3} style={{ marginBottom: "8px" }}>
                          {user.displayName || "User"}
                        </Title>
                        <Text type="secondary">{user.email}</Text>
                      </div>
                    </Space>
                  </Card>
                )}

                <div style={{ textAlign: "center" }}>
                  <Space
                    size="middle"
                    direction={window.innerWidth <= 768 ? "vertical" : "horizontal"}
                    style={{ width: "100%" }}
                  >
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleJoinQuiz}
                      style={{ width: window.innerWidth <= 768 ? "100%" : "auto" }}
                    >
                      Join Quiz
                    </Button>

                    <Button
                      danger
                      size="large"
                      onClick={handleSignOut}
                      style={{ width: window.innerWidth <= 768 ? "100%" : "auto" }}
                    >
                      Sign Out
                    </Button>
                  </Space>
                </div>

                <Divider />

                <div style={{ textAlign: "center" }}>
                  <Button type="dashed" size="small" onClick={handleAdminAccess}>
                    Admin Access
                  </Button>
                </div>
              </Space>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: "800px" }}>
              <LeaderboardPodium />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
