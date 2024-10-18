import stripe from "stripe";
import { Parser } from "json2csv";

const stripeInstance = stripe(process?.env?.STRIPE_LIVE_KEY, {
  apiVersion: process.env?.STRIPE_API_VERSION,
});

export async function transactions(req, res) {
  try {
    let { startDate, endDate, page, lastTransactionId } = req?.query;
    page = parseInt(page) || 1; // Convert to integer

    // Check if startDate and endDate are provided
    if (!startDate) {
      return res.status(400).json({ error: "startDate is required" });
    }

    if (!endDate) {
      return res.status(400).json({ error: "endDate is required" });
    }

    // Check if startDate and endDate are valid dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Both dates must be valid." });
    }

    // Check if endDate is greater than or equal to startDate
    if (end < start) {
      return res
        .status(400)
        .json({ error: "endDate must be greater than or equal to startDate" });
    }

    // Conversion to UTC format (in seconds)
    const startUTC = Math.floor(start.getTime() / 1000);
    const endUTC = Math.floor(end.getTime() / 1000);

    // Use the UTC timestamps in the params
    const params = {
      created: {
        gte: startUTC,
        lte: endUTC,
      },
      limit: 10000,
      status: "succeeded",
      // ...(lastTransactionId && { starting_after: lastTransactionId }), // Use the last transaction ID for pagination
    };

    const response = await stripeInstance.charges.list(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching transactions" });
  }
}

// Function to fetch charges based on date range and status 'Succeeded'
async function fetchTransactions(startDate, endDate) {
  let hasMore = true;
  let charges = [];
  let startingAfter = null;

  while (hasMore) {
    const params = {
      created: {
        gte: startDate,
        lte: endDate,
      },
      limit: 10,
      status: "succeeded",
    };

    // Only add starting_after if it has a value
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const response = await stripeInstance.charges.list(params);

    charges = charges.concat(response.data);
    hasMore = response.has_more;

    // Update startingAfter with the last charge ID from the response
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    } else {
      hasMore = false; // If no charges, exit loop
    }
  }

  return charges.filter((charge) => charge.status === "succeeded");
}

// Helper function to map transaction data to the required fields
// succeeded
function mapTransactionData(charges) {
  return charges.map((charge) => ({
    ID: charge.id,
    "Created date (UTC)": new Date(charge.created * 1000).toISOString(),
    Amount: charge.amount / 100, // converting to actual currency units
    "Amount Refunded": charge.amount_refunded / 100,
    Currency: charge.currency.toUpperCase(),
    Captured: charge.captured,
    "Converted Amount": charge.amount_captured / 100,
    "Converted Amount Refunded": charge.amount_refunded / 100,
    "Converted Currency": charge.currency.toUpperCase(),
    "Decline Reason": charge.failure_message || "",
    Description: charge.description || "",
    Fee: charge.balance_transaction ? charge.balance_transaction.fee / 100 : "",
    "Is Link": charge.payment_method_details?.type === "link",
    "Link Funding": charge.payment_method_details?.link?.funding || "",
    Mode: charge.payment_intent ? "payment_intent" : "charge",
    "PaymentIntent ID": charge.payment_intent || "",
    "Payment Source Type": charge.payment_method_details?.type || "",
    "Refunded date (UTC)": charge.refunded
      ? new Date(charge.refunds.data[0].created * 1000).toISOString()
      : "",
    "Statement Descriptor": charge.statement_descriptor || "",
    Status: charge.status,
    "Seller Message": charge.outcome?.seller_message || "",
    "Taxes On Fee": charge.balance_transaction
      ? charge.balance_transaction.tax || ""
      : "",
    "Card ID": charge.payment_method_details?.card?.id || "",
    "Card Name": charge.payment_method_details?.card?.name || "",
    "Card Address Line1":
      charge.payment_method_details?.card?.address_line1 || "",
    "Card Address Line2":
      charge.payment_method_details?.card?.address_line2 || "",
    "Card Address City":
      charge.payment_method_details?.card?.address_city || "",
    "Card Address State":
      charge.payment_method_details?.card?.address_state || "",
    "Card Address Country":
      charge.payment_method_details?.card?.address_country || "",
    "Card Address Zip": charge.payment_method_details?.card?.address_zip || "",
    "Card AVS Line1 Status":
      charge.payment_method_details?.card?.checks?.address_line1_check || "",
    "Card AVS Zip Status":
      charge.payment_method_details?.card?.checks?.address_zip_check || "",
    "Card Brand": charge.payment_method_details?.card?.brand || "",
    "Card CVC Status":
      charge.payment_method_details?.card?.checks?.cvc_check || "",
    "Card Exp Month": charge.payment_method_details?.card?.exp_month || "",
    "Card Exp Year": charge.payment_method_details?.card?.exp_year || "",
    "Card Fingerprint": charge.payment_method_details?.card?.fingerprint || "",
    "Card Funding": charge.payment_method_details?.card?.funding || "",
    "Card Issue Country": charge.payment_method_details?.card?.country || "",
    "Card Last4": charge.payment_method_details?.card?.last4 || "",
    "Card Tokenization Method":
      charge.payment_method_details?.card?.tokenization_method || "",
    "Customer ID": charge.customer || "",
    "Customer Description": charge.customer ? charge.customer.description : "",
    "Customer Email": charge.receipt_email || "",
    "Customer Phone": charge.billing_details?.phone || "",
    "Shipping Name": charge.shipping?.name || "",
    "Shipping Address Line1": charge.shipping?.address?.line1 || "",
    "Shipping Address Line2": charge.shipping?.address?.line2 || "",
    "Shipping Address City": charge.shipping?.address?.city || "",
    "Shipping Address State": charge.shipping?.address?.state || "",
    "Shipping Address Country": charge.shipping?.address?.country || "",
    "Shipping Address Postal Code": charge.shipping?.address?.postal_code || "",
    "Disputed Amount": charge.dispute ? charge.dispute.amount / 100 : "",
    "Dispute Reason": charge.dispute ? charge.dispute.reason : "",
    "Dispute Status": charge.dispute ? charge.dispute.status : "",
    "Invoice ID": charge.invoice || "",
    "Invoice Number": charge.invoice ? charge.invoice_number : "",
    "Checkout Session ID": charge.checkout_session || "",
    "Checkout Custom Field 1 Key": charge.metadata?.custom_field_1_key || "",
    "Checkout Custom Field 1 Value":
      charge.metadata?.custom_field_1_value || "",
    "Checkout Custom Field 2 Key": charge.metadata?.custom_field_2_key || "",
    "Checkout Custom Field 2 Value":
      charge.metadata?.custom_field_2_value || "",
    "Checkout Custom Field 3 Key": charge.metadata?.custom_field_3_key || "",
    "Checkout Custom Field 3 Value":
      charge.metadata?.custom_field_3_value || "",
    "Checkout Line Item Summary": charge.metadata?.line_item_summary || "",
    "Checkout Promotional Consent": charge.metadata?.promotional_consent || "",
    "Checkout Terms of Service Consent": charge.metadata?.tos_consent || "",
    "Client Reference ID": charge.client_reference_id || "",
    "Payment Link ID": charge.payment_link || "",
    "UTM Campaign": charge.metadata?.utm_campaign || "",
    "UTM Content": charge.metadata?.utm_content || "",
    "UTM Medium": charge.metadata?.utm_medium || "",
    "UTM Source": charge.metadata?.utm_source || "",
    "UTM Term": charge.metadata?.utm_term || "",
    "Terminal Location ID": charge.terminal_location || "",
    "Terminal Reader ID": charge.terminal_reader || "",
    "Application Fee": charge.application_fee_amount / 100 || "",
    "Application ID": charge.application || "",
    Destination: charge.destination || "",
    Transfer: charge.transfer || "",
    "Transfer Group": charge.transfer_group || "",
    Fund: charge.metadata?.["Product Names"] || "",
  }));
}

// Main function to fetch data and export to CSV
export async function exportTransactionsToCSV(req, res) {
  const { startDate, endDate } = req?.query;
  // Check if startDate and endDate are provided
  if (!startDate) {
    return res.status(400).json({ error: "startDate is required" });
  }

  if (!endDate) {
    return res.status(400).json({ error: "endDate is required" });
  }

  // Check if startDate and endDate are valid dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: "Both dates must be valid." });
  }

  // Check if endDate is greater than or equal to startDate
  if (end < start) {
    return res
      .status(400)
      .json({ error: "endDate must be greater than or equal to startDate" });
  }

  // Conversion to UTC format (in seconds)
  const startUTC = Math.floor(start.getTime() / 1000);
  const endUTC = Math.floor(end.getTime() / 1000);

  const transactions = await fetchTransactions(startUTC, endUTC);
  const mappedData = mapTransactionData(transactions);

  const fields = Object.keys(mappedData[0]); // Use keys of first entry as CSV headers
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(mappedData);
  res.send(csv);
}
