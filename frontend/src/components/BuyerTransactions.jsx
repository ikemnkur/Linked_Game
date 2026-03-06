import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  Chip,
  CircularProgress,
  Modal,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Visibility,
  Key,
  MonetizationOn,
  Report,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";


// Helper component for the modal with Video Scrambler specific styling
const DetailsModal = ({ transaction, open, handleClose }) => {
  const navigate = useNavigate();

  if (!transaction) return null;

  const getTransactionIcon = (type) => {
    switch (type) {
      case "Key Purchase":
        return <Key sx={{ color: "#ffd700", mr: 1 }} />;
      case "Credit Purchase":
        return <MonetizationOn sx={{ color: "#2e7d32", mr: 1 }} />;
      case "Report Submitted":
        return <Report sx={{ color: "#f44336", mr: 1 }} />;
      default:
        return null;
    }
  };

  const goToSeller = (username) => {
    if (username && username !== "System") {
      navigate(`/seller/${username}`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper
        sx={{
          p: 4,
          width: { xs: "90%", md: "550px" },
          maxHeight: "80vh",
          overflowY: "auto",
          position: "relative",
          backgroundColor: "#1a1a1a",
          border: "2px solid #ffd700",
          borderRadius: 2,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "#ffd700",
            "&:hover": { backgroundColor: "#333" },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          {getTransactionIcon(transaction.transaction_type)}
          <Typography variant="h5" sx={{ color: "#ffd700", fontWeight: 600 }}>
            Transaction Details
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#b0b0b0" }}>
              Transaction ID: ..................
            </Typography>
            <Typography sx={{ color: "#e0e0e0", fontFamily: "monospace" }}>
              #{transaction.id}
            </Typography>
          </Box>

          {transaction.key_title && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ color: "#b0b0b0" }}>Item:</Typography>
              <Typography sx={{ color: "#ffd700", fontWeight: 600 }}>
                {transaction.key_title}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#b0b0b0" }}>Amount:</Typography>
            <Typography
              sx={{
                color:
                  transaction.transaction_type === "Credit Purchase"
                    ? "#2e7d32"
                    : "#ffd700",
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              {transaction.credits} credits
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#b0b0b0" }}>Type:</Typography>
            <Chip
              label={transaction.transaction_type}
              size="small"
              sx={{
                backgroundColor:
                  transaction.transaction_type === "Key Purchase"
                    ? "#ffd700"
                    : transaction.transaction_type === "Credit Purchase"
                    ? "#2e7d32"
                    : "#f44336",
                color: "#000",
                fontWeight: 600,
              }}
            />
          </Box>

          {transaction.sellerUsername && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ color: "#b0b0b0" }}>Seller:</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ color: "#e0e0e0" }}>
                  {transaction.sellerUsername}
                </Typography>
                <Button
                  onClick={() => goToSeller(transaction.sellerUsername)}
                  variant="outlined"
                  size="small"
                  startIcon={<Visibility />}
                  sx={{
                    borderColor: "#ffd700",
                    color: "#ffd700",
                    "&:hover": {
                      backgroundColor: "#ffd700",
                      color: "#000",
                    },
                    textTransform: "none",
                    minWidth: 0,
                    px: 1,
                    py: 0.5,
                  }}
                >
                  View
                </Button>
              </Box>
            </Box>
          )}

          {transaction.payment_method && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ color: "#b0b0b0" }}>Payment Method:</Typography>
              <Typography sx={{ color: "#e0e0e0" }}>
                {transaction.payment_method}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#b0b0b0" }}>Date:</Typography>
            <Typography sx={{ color: "#e0e0e0" }}>
              {new Date(transaction.created_at).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ color: "#b0b0b0" }}>Status:</Typography>
            <Chip
              label={transaction.status}
              size="small"
              sx={{
                backgroundColor:
                  transaction.status === "Completed"
                    ? "#2e7d32"
                    : transaction.status === "Processing"
                    ? "#ff9800"
                    : "#f44336",
                color: "#fff",
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ color: "#b0b0b0", mb: 1 }}>Message:</Typography>
            <Box
              sx={{
                p: 2,
                backgroundColor: "#2a2a2a",
                border: "1px solid #555",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ color: "#e0e0e0" }}>
                {transaction.message || "No message provided."}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

const BuyerTransactions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; // = import.meta.env.VITE_API_SERVER_URL || "http://localhost:3001";

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        // Get current user from localStorage
        const userData = JSON.parse(
          localStorage.getItem("userdata")  
        );
        const username = userData.username || "seller_123";
        const token = localStorage.getItem('token');

        // Check if token exists
        if (!token) {
          throw new Error('No authentication token found. Please login again.');
        }

        // Fetch data with JWT authentication
        // Axios automatically includes the Authorization header via interceptor in api/client.js
        // But we can also pass it explicitly for clarity
        const actionsResponse = await axios.get(
          `${API_URL}/api/actions/${username}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const creditsResponse = await axios.get(
          `${API_URL}/api/buyCredits/${username}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Axios wraps the response in a data property
        // Axios also automatically throws errors for bad status codes
        const allActions = actionsResponse.data;
        const allCreditPurchases = creditsResponse.data;

        // Filter for current user's transactions
        const userActions = allActions.filter(
          (action) => action.username === username
        );
        const userCredits = allCreditPurchases.filter(
          (credit) => credit.username === username
        );

        // Combine both datasets for processing
        const combinedData = [...userActions, ...userCredits];
        console.log("Fetched combined transaction data:", combinedData);

        // Sort by date descending by default
        combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Transform actions to transaction format
        const actionsTransactions = userActions.map((action) => {
          const transactionType = action.action_description?.includes("pass") 
            ? "Pass Purchase" 
            : "Scrambling Media Purchase";
          
          return {
            id: `action_${action.id}`,
            transaction_type: transactionType,
            credits: action.action_cost,
            amount_usd: (action.price * 0.01).toFixed(2), // Assuming 1 credit = $0.01
            title: action.action_type,
            buyer_username: action.username,
            status: "Completed",
            created_at: new Date(action.date).toISOString(),
            message: `Scrambling Media Purchase: ${action.keyTitle}`,
            payout_method: null,
            commission_rate: null,
          };
        });

        // Transform credit purchases to transaction format
        const creditTransactions = userCredits.map((credit) => ({
          id: `credit_${credit.id}`,
          transaction_type: "Credit Purchase",
          credits: credit.credits,
          amount_usd: credit.amount, // Keep original amount precision
          title: credit.package +" via " + credit.paymentMethod,
          buyer_username: credit.username,
          status: credit.status,
          created_at: new Date(credit.date).toISOString(),
          message: `Credit Purchase: ${credit.credits} credits via ${credit.currency}`,
          payout_method: credit.currency,
          commission_rate: null,
          paymentMethod: credit.paymentMethod,
        }));

        // Combine all transactions
        const allTransactions = [...actionsTransactions, ...creditTransactions];

        // Sort by date descending
        allTransactions.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        setTransactions(allTransactions);
        setFilteredTransactions(allTransactions);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch transaction history:", err);
        
        // Handle authentication errors specifically
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError(
            "Your session has expired. Please log out and log back in to continue."
          );
          // Optionally, auto-redirect to login after a delay
          setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('userdata');
            window.location.href = '/login';
          }, 3000);
        } else {
          setError("Failed to load transaction history. Please try again later.");
        }
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const searchTransactions = () => {
    const term = searchTerm.toLowerCase();
    const safe = (v) => (v ? String(v).toLowerCase() : "");
    const filtered = transactions.filter(
      (t) =>
        safe(t.sellerUsername).includes(term) ||
        safe(t.key_title).includes(term) ||
        safe(t.message).includes(term) ||
        safe(t.transaction_type).includes(term) ||
        safe(t.amount).includes(term) ||
        safe(t.status).includes(term)
    );
    setFilteredTransactions(filtered);
  };

  const handleSearch = (e) => {
    e?.preventDefault?.();
    searchTransactions();
  };

  const handleReset = () => {
    setSearchTerm("");
    setFilteredTransactions(transactions);
  };

  const sortTransactions = (rows) => {
    const sorted = [...rows].sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "date":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "amount":
          aValue = parseFloat(a.amount || 0);
          bValue = parseFloat(b.amount || 0);
          break;
        case "seller":
          aValue = String(a.sellerUsername || "").toLowerCase();
          bValue = String(b.sellerUsername || "").toLowerCase();
          break;
        case "status":
          aValue = String(a.status || "").toLowerCase();
          bValue = String(b.status || "").toLowerCase();
          break;
        case "type":
          aValue = String(a.transaction_type || "").toLowerCase();
          bValue = String(b.transaction_type || "").toLowerCase();
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const transactionsToDisplay = sortTransactions(filteredTransactions);

  // Remove the problematic setTimeout - this was causing issues
  // setTimeout(() => {
  //   // transactionsToDisplay = sortTransactions(filteredTransactions);
  //   console.log('Updated transactions to display after timeout:', transactionsToDisplay);
  // }, 1000);

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Item/Method",
      "Seller",
      "Credits",
      "Status",
      "Message",
    ];
    const rows = transactionsToDisplay.map((t) => [
      new Date(t.created_at).toLocaleDateString(),
      t.transaction_type,
      t.title || t.paymentMethod || "N/A",
      t.sellerUsername || "System",
      t.credits || 0,
      t.status,
      t.message || "",
    ]);

    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "buyer-transactions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        backgroundColor: "#0a0a0a",
        minHeight: "100vh",
        p: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: "center" }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            color: "#ffd700",
            mb: 1,
          }}
        >
          Purchase History
        </Typography>
        <Typography variant="h6" sx={{ color: "#e0e0e0" }}>
          Track your key purchases and credit transactions
        </Typography>
      </Box>

      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          backgroundColor: "#1a1a1a",
          border: "2px solid #ffd700",
          borderRadius: 2,
        }}
      >
        {/* Controls */}
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, mb: 2, color: "#ffd700" }}
        >
          Your Purchase History
        </Typography>

        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            position: "relative",
            mb: 2,
            p: { xs: 0.5, sm: 1 },
          }}
        >
          {/* Search Row */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "nowrap",
              width: "100%",
              mb: 1,
            }}
          >
            <TextField
              label="Search transactions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                flexBasis: "85%",
                flexGrow: 1,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#2a2a2a",
                  color: "#e0e0e0",
                  "& fieldset": { borderColor: "#555" },
                  "&:hover fieldset": { borderColor: "#ffd700" },
                  "&.Mui-focused fieldset": { borderColor: "#ffd700" },
                },
                "& .MuiInputLabel-root": { color: "#b0b0b0" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#ffd700" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#ffd700" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                textTransform: "none",
                flexBasis: "15%",
                minWidth: 0,
                px: 2,
                flexShrink: 0,
                whiteSpace: "nowrap",
                backgroundColor: "#2e7d32",
                "&:hover": { backgroundColor: "#388e3c" },
              }}
            >
              Search
            </Button>
          </Box>

          {/* Filters and Count Row */}
          <Box
            sx={{
              mt: 1.5,
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
                flex: 1,
              }}
            >
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                size="small"
                sx={{
                  minWidth: 100,
                  backgroundColor: "#2a2a2a",
                  color: "#e0e0e0",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ffd700",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ffd700",
                  },
                }}
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="amount">Credits</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>

              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                size="small"
                sx={{
                  minWidth: 100,
                  backgroundColor: "#2a2a2a",
                  color: "#e0e0e0",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ffd700",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#ffd700",
                  },
                }}
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>

              <Chip
                label={`${transactionsToDisplay.length} transaction${
                  transactionsToDisplay.length === 1 ? "" : "s"
                }`}
                variant="outlined"
                sx={{
                  marginRight: "1%",
                  borderColor: "#ffd700",
                  color: "#ffd700",
                  backgroundColor: "#2a2a2a",
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: { xs: 400, md: 500 },
            overflowY: "auto",
            overflowX: "auto",
            borderRadius: 1,
            backgroundColor: "#2a2a2a",
          }}
        >
          <Table
            sx={{
              minWidth: { xs: 320, sm: 500 },
              "& .MuiTableCell-root": {
                px: { xs: 0.5, sm: 2 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                borderBottom: "1px solid #444",
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                fontWeight: 600,
                fontSize: { xs: "0.7rem", sm: "0.875rem" },
                px: { xs: 0.5, sm: 2 },
                backgroundColor: "#1a1a1a",
                color: "#ffd700",
                borderBottom: "2px solid #ffd700",
              },
            }}
            aria-label="buyer transaction history table"
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ width: { xs: "20%", sm: "auto" }, color: "#ffd700" }}
                >
                  Credits
                </TableCell>
                <TableCell
                  sx={{ width: { xs: "35%", sm: "auto" }, color: "#ffd700" }}
                >
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    Item
                  </Box>
                  <Box sx={{ display: { xs: "block", sm: "none" } }}>
                    Details
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ width: { xs: "20%", sm: "auto" }, color: "#ffd700" }}
                >
                  Type
                </TableCell>
                <TableCell
                  sx={{ width: { xs: "15%", sm: "auto" }, color: "#ffd700" }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{ width: { xs: "10%", sm: "auto" }, color: "#ffd700" }}
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ color: "#e0e0e0", py: 4 }}
                  >
                    <CircularProgress sx={{ color: "#ffd700" }} />
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ color: "#f44336", py: 4 }}
                  >
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!loading && transactionsToDisplay.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{
                      color: "#b0b0b0",
                      py: 4,
                      fontStyle: "italic",
                    }}
                  >
                    No transactions found. Your purchases will appear here.
                  </TableCell>
                </TableRow>
              )}
              {transactionsToDisplay.map((t) => {
                // normalize common fields coming from different APIs / transformations
                const title =
                  t.title ||
                  t.key_title ||
                  t.key ||
                  t.item ||
                  t.name ||
                  null;
                const seller =
                  t.sellerUsername ||
                  t.seller_username ||
                  t.buyer_username ||
                  t.username ||
                  null;
                const paymentMethod =
                  t.payment_method || t.payout_method || t.currency || null;

                return (
                  <TableRow
                    key={t.id}
                    hover
                    onClick={() => handleRowClick(t)}
                    sx={{
                      cursor: "pointer",
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": {
                        backgroundColor: "#333",
                      },
                      backgroundColor: "#2a2a2a",
                    }}
                  >
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        color: "#2e7d32",
                      }}
                    >
                      {t.credits || 0} ₡
                    </TableCell>

                    <TableCell sx={{ color: "#e0e0e0" }}>
                      <Box>
                        {/* Desktop view - show item and seller */}
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                          
                           <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.75rem",
                                color: "#ffd700",
                              }}
                            >
                              {title}
                            </Typography>

                          {/* {title && (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.75rem",
                                color: "#ffd700",
                              }}
                            >
                              {title}
                            </Typography>
                          )}
                          {seller && (
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.75rem", color: "#b0b0b0" }}
                            >
                              by {seller}
                            </Typography>
                          )}
                          {paymentMethod && (
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.75rem", color: "#b0b0b0" }}
                            >
                              via {paymentMethod}
                            </Typography>
                          )} */}
                        </Box>

                        {/* Mobile view - compact format */}
                        <Box sx={{ display: { xs: "block", sm: "none" } }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: "bold",
                              fontSize: "0.65rem",
                              lineHeight: 1.2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "#ffd700",
                            }}
                          >
                            {t.title || t.paymentMethod || "Transaction"}
                          </Typography>
                          {t.sellerUsername && (
                            <Typography
                              variant="caption"
                              sx={{ color: "#b0b0b0" }}
                            >
                              {t.sellerUsername}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={t.transaction_type}
                        size="small"
                        sx={{
                          fontSize: { xs: "0.6rem", sm: "0.75rem" },
                          height: { xs: 20, sm: 24 },
                          backgroundColor:
                            t.transaction_type === "Key Purchase"
                              ? "#ffd700"
                              : t.transaction_type === "Credit Purchase"
                              ? "#2e7d32"
                              : "#f44336",
                          color: "#000",
                          fontWeight: 600,
                          "& .MuiChip-label": {
                            px: { xs: 0.5, sm: 1 },
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ color: "#e0e0e0" }}>
                      <Box>
                        {/* Desktop view - full date */}
                        <Typography
                          variant="body2"
                          sx={{
                            display: { xs: "none", sm: "block" },
                            fontSize: "0.75rem",
                          }}
                        >
                          {new Date(t.created_at).toLocaleDateString()}
                        </Typography>

                        {/* Mobile view - short date */}
                        <Typography
                          variant="body2"
                          sx={{
                            display: { xs: "block", sm: "none" },
                            fontSize: "0.65rem",
                            lineHeight: 1.2,
                          }}
                        >
                          {new Date(t.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={t.status}
                        size="small"
                        sx={{
                          fontSize: { xs: "0.6rem", sm: "0.75rem" },
                          height: { xs: 18, sm: 22 },
                          backgroundColor:
                            t.status === "Completed"
                              ? "#2e7d32"
                              : t.status === "Processing"
                              ? "#ff9800"
                              : "#f44336",
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add a mobile action hint */}
        <Box
          sx={{
            display: { xs: "block", sm: "none" },
            mt: 1,
            textAlign: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Tap any row to view details and actions
          </Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        {/* Right side: Export button */}
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={exportToCSV}
            sx={{
              textTransform: "none",
              flexShrink: 0,
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Paper>

      {/* Transaction Details Modal */}
      <DetailsModal
        transaction={selectedTransaction}
        open={showDetailsModal}
        handleClose={() => setShowDetailsModal(false)}
      />
    </Box>
  );
};

export default BuyerTransactions;
