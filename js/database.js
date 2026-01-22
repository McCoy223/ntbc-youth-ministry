// Database operations for the application

class Database {
    // ===== MEMBER MANAGEMENT =====
    static async addMember(memberData) {
        try {
            const memberRef = await db.collection('members').add({
                ...memberData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
            
            // Log activity
            await this.logActivity('member_added', `Added member: ${memberData.name}`);
            
            return memberRef.id;
        } catch (error) {
            console.error('Error adding member:', error);
            throw error;
        }
    }
    
    static async getMembers(filters = {}) {
        try {
            let query = db.collection('members');
            
            // Apply filters
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            if (filters.minDate) {
                query = query.where('createdAt', '>=', filters.minDate);
            }
            
            const snapshot = await query.orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting members:', error);
            throw error;
        }
    }
    
    static async updateMember(memberId, updates) {
        try {
            await db.collection('members').doc(memberId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await this.logActivity('member_updated', `Updated member: ${memberId}`);
        } catch (error) {
            console.error('Error updating member:', error);
            throw error;
        }
    }
    
    static async deleteMember(memberId) {
        try {
            // Soft delete by updating status
            await db.collection('members').doc(memberId).update({
                status: 'inactive',
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await this.logActivity('member_deleted', `Deleted member: ${memberId}`);
        } catch (error) {
            console.error('Error deleting member:', error);
            throw error;
        }
    }
    
    // ===== FINANCE MANAGEMENT =====
    static async addTransaction(transactionData) {
        try {
            const transRef = await db.collection('transactions').add({
                ...transactionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                recordedBy: auth.currentUser.uid
            });
            
            await this.logActivity('transaction_added', 
                `Added ${transactionData.type}: $${transactionData.amount}`);
            
            return transRef.id;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }
    
    static async getTransactions(startDate, endDate) {
        try {
            let query = db.collection('transactions');
            
            if (startDate && endDate) {
                query = query.where('date', '>=', startDate)
                            .where('date', '<=', endDate);
            }
            
            const snapshot = await query.orderBy('date', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }
    
    static async getFinancialSummary() {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            // Get transactions for current month
            const transactions = await this.getTransactions(startOfMonth, now);
            
            const summary = {
                totalIncome: 0,
                totalExpenses: 0,
                balance: 0,
                transactionsCount: transactions.length
            };
            
            transactions.forEach(trans => {
                if (trans.type === 'income') {
                    summary.totalIncome += parseFloat(trans.amount);
                } else {
                    summary.totalExpenses += parseFloat(trans.amount);
                }
            });
            
            summary.balance = summary.totalIncome - summary.totalExpenses;
            
            return summary;
        } catch (error) {
            console.error('Error getting financial summary:', error);
            throw error;
        }
    }
    
    // ===== EVENT MANAGEMENT =====
    static async addEvent(eventData) {
        try {
            const eventRef = await db.collection('events').add({
                ...eventData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid,
                attendees: []
            });
            
            await this.logActivity('event_created', `Created event: ${eventData.title}`);
            
            return eventRef.id;
        } catch (error) {
            console.error('Error adding event:', error);
            throw error;
        }
    }
    
    static async getUpcomingEvents(limit = 5) {
        try {
            const now = new Date();
            const snapshot = await db.collection('events')
                .where('date', '>=', now)
                .orderBy('date', 'asc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting events:', error);
            throw error;
        }
    }
    
    // ===== ACTIVITY LOGGING =====
    static async logActivity(action, details) {
        try {
            const user = auth.currentUser;
            await db.collection('activity_log').add({
                action,
                details,
                userId: user.uid,
                userEmail: user.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
    
    static async getRecentActivities(limit = 10) {
        try {
            const snapshot = await db.collection('activity_log')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting activities:', error);
            throw error;
        }
    }
    
    // ===== DASHBOARD STATS =====
    static async getDashboardStats() {
        try {
            // Get counts in parallel
            const [
                membersSnapshot,
                eventsSnapshot,
                summary,
                activities
            ] = await Promise.all([
                db.collection('members').where('status', '==', 'active').get(),
                this.getUpcomingEvents(),
                this.getFinancialSummary(),
                this.getRecentActivities(5)
            ]);
            
            return {
                memberCount: membersSnapshot.size,
                eventCount: eventsSnapshot.length,
                financialSummary: summary,
                recentActivities: activities
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            throw error;
        }
    }
}

// Make available globally
window.Database = Database;