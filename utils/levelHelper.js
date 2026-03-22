import Seller from "../models/Seller.js";
import Order from "../models/Order.js";
import { createNotification } from "./notificationHelper.js";

/**
 * Seller ka level check karo aur zaroorat pe upgrade karo
 * Ye function har order complete hone ke baad call hoga
 */
export const checkAndUpdateLevel = async (sellerId, userId) => {
  try {
    const seller = await Seller.findOne({ userId });
    if (!seller) return;

    // Active days calculate karo (account creation se aaj tak)
    const joinedAt   = seller.createdAt;
    const now        = new Date();
    const activeDays = Math.floor((now - joinedAt) / (1000 * 60 * 60 * 24));

    // Unique clients count karo (distinct buyerIds from completed orders)
    const completedOrders = await Order.find({
      sellerId: userId,
      status:   "completed",
    }).select("buyerId");

    const uniqueClientSet = new Set(
      completedOrders.map((o) => o.buyerId.toString())
    );
    const uniqueClients = uniqueClientSet.size;

    // Stats update karo
    seller.activeDays    = activeDays;
    seller.uniqueClients = uniqueClients;

    const oldLevel = seller.level;
    let newLevel   = oldLevel;

    // ── Level 2 check ────────────────────────────────────────
    // Orders: 20+, Unique Clients: 10+, Earnings: $2000+,
    // Rating: 7/10 (avg 3.5/5 scale pe = 7), Active Days: 120+
    const ratingScore = seller.rating * 2; // 5-star to 10-point convert

    if (
      seller.completedOrders >= 20 &&
      uniqueClients          >= 10 &&
      seller.totalEarnings   >= 2000 &&
      ratingScore            >= 7 &&
      activeDays             >= 120
    ) {
      newLevel = "level_2";
    }
    // ── Level 1 check ────────────────────────────────────────
    // Orders: 5+, Unique Clients: 3+, Earnings: $400+,
    // Rating: 5/10, Active Days: 60+
    else if (
      seller.completedOrders >= 5 &&
      uniqueClients          >= 3 &&
      seller.totalEarnings   >= 400 &&
      ratingScore            >= 5 &&
      activeDays             >= 60
    ) {
      newLevel = "level_1";
    }

    seller.level = newLevel;

    if (newLevel !== oldLevel) {
      seller.levelUpdatedAt = new Date();
      await seller.save();

      // Level up notification
      const levelLabel = newLevel === "level_1" ? "Level 1 Seller 🥈" : "Level 2 Seller 🥇";
      await createNotification({
        userId,
        title:   `Mubarak! Aap ${levelLabel} Ban Gaye! 🎉`,
        message: `Aapne tamam requirements poori kar li hain. Aapka seller level upgrade ho gaya!`,
        type:    "general",
        link:    `/seller/dashboard`,
      });
    } else {
      await seller.save();
    }

    return { level: newLevel, upgraded: newLevel !== oldLevel };
  } catch (err) {
    console.error("Level check error:", err.message);
  }
};

/**
 * Level requirements return karo (progress bar ke liye)
 */
export const getLevelProgress = (seller) => {
  const activeDays  = seller.activeDays  || 0;
  const uniqueClients = seller.uniqueClients || 0;
  const ratingScore = (seller.rating || 0) * 2;

  return {
    current: seller.level || "new_seller",

    level1: {
      label:       "Level 1",
      completed:   seller.level === "level_1" || seller.level === "level_2",
      requirements: [
        { label: "Completed Orders", current: seller.completedOrders || 0, target: 5,   done: (seller.completedOrders || 0) >= 5   },
        { label: "Unique Clients",   current: uniqueClients,               target: 3,   done: uniqueClients >= 3                   },
        { label: "Total Earnings",   current: seller.totalEarnings || 0,   target: 400, done: (seller.totalEarnings || 0) >= 400,  prefix: "$" },
        { label: "Success Score",    current: ratingScore,                 target: 5,   done: ratingScore >= 5                     },
        { label: "Active Days",      current: activeDays,                  target: 60,  done: activeDays >= 60                     },
      ],
    },

    level2: {
      label:       "Level 2",
      completed:   seller.level === "level_2",
      requirements: [
        { label: "Completed Orders", current: seller.completedOrders || 0, target: 20,   done: (seller.completedOrders || 0) >= 20   },
        { label: "Unique Clients",   current: uniqueClients,               target: 10,   done: uniqueClients >= 10                   },
        { label: "Total Earnings",   current: seller.totalEarnings || 0,   target: 2000, done: (seller.totalEarnings || 0) >= 2000,  prefix: "$" },
        { label: "Success Score",    current: ratingScore,                 target: 7,    done: ratingScore >= 7                      },
        { label: "Active Days",      current: activeDays,                  target: 120,  done: activeDays >= 120                     },
      ],
    },
  };
};