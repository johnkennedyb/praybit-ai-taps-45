
import { useEffect, useState } from "react";
import { CircleDollarSign, Zap, Award, Users, Trophy, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { useWeb3 } from "@/contexts/Web3Context";
import CoinTapper from "@/components/CoinTapper";
import { toast } from "@/hooks/use-toast";
import ReferralSystem from "@/components/ReferralSystem";
import { Progress } from "@/components/ui/progress";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import Stats from "@/components/Stats";
import { supabase } from "@/integrations/supabase/client";
import { useSupabase } from "@/contexts/SupabaseContext";
import { usePrayData } from "@/hooks/use-pray-data";

const Earn = () => {
  const { account } = useWeb3();
  const { user } = useSupabase();
  const [referralCount, setReferralCount] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { data, incrementTaps, claimDailyReward, updateCoins } = usePrayData();
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch the number of referrals for the current user
        const { data, error } = await supabase
          .from('referrals')
          .select('*', { count: 'exact' })
          .eq('referrer_id', user.id);

        if (error) {
          throw error;
        }

        const count = data ? data.length : 0;
        setReferralCount(count);
        setIsEligible(count >= 3);
        setProgress(Math.min(count, 3) / 3 * 100); // Cap progress at 100%
      } catch (error: any) {
        toast({
          title: "Error fetching referral count",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkEligibility();
    
    // Load leaderboard data
    const fetchLeaderboard = async () => {
      try {
        const { data: leaderboardData, error } = await supabase
          .from('user_stats')
          .select('user_id, coins')
          .order('coins', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        if (leaderboardData) setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      }
    };
    
    fetchLeaderboard();
  }, [user]);

  const handleRefer = () => {
    // Refresh referral count after a new referral is created
    setIsLoading(true);
    if (user) {
      supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', user.id)
        .then(({ data, error }) => {
          setIsLoading(false);
          if (error) {
            toast({
              title: "Error fetching referral count",
              description: error.message,
              variant: "destructive",
            });
            return;
          }

          const count = data ? data.length : 0;
          setReferralCount(count);
          setIsEligible(count >= 3);
          setProgress(Math.min(count, 3) / 3 * 100); // Cap progress at 100%
        });
    }
  };

  const handleTap = () => {
    incrementTaps();
    toast({
      title: "PRAY Mined!",
      description: `You earned ${data.miningPower} PRAY tokens`,
    });
  };

  const handleClaimDailyReward = () => {
    const claimed = claimDailyReward();
    if (claimed) {
      toast({
        title: "Daily Reward Claimed!",
        description: "You earned 5 PRAY tokens.",
      });
    } else {
      toast({
        title: "Already Claimed",
        description: "You've already claimed your daily reward today.",
        variant: "destructive",
      });
    }
  };

  const handleClaimAchievement = () => {
    if (isEligible) {
      updateCoins(50);
      
      toast({
        title: "Achievement Reward Claimed!",
        description: "You earned 50 PRAY tokens for inviting 3 friends!",
      });
      
      // Mark achievement as claimed in Supabase
      if (user) {
        supabase.from('user_achievements')
          .upsert({
            user_id: user.id,
            achievement_id: 'referral_milestone',
            claimed_at: new Date().toISOString()
          })
          .then(({ error }) => {
            if (error) {
              console.error('Error recording achievement claim:', error);
            }
          });
      }
    } else {
      toast({
        title: "Not Eligible",
        description: "You need to invite 3 friends first.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout title="Earn">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Coin Tapper Card */}
        <Card className="bg-blue-800/50 border-blue-700 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Praybit Tapper
            </CardTitle>
            <CardDescription>Tap to earn PRAY tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <CoinTapper 
              onTap={handleTap} 
              coins={data.coins || 0} 
              coinsPerTap={data.miningPower || 1} 
            />
          </CardContent>
        </Card>

        {/* Referral System Card */}
        <Card className="bg-blue-800/50 border-blue-700 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              Referral Program
            </CardTitle>
            <CardDescription>Invite friends and earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <ReferralSystem onRefer={handleRefer} referralCount={referralCount} />
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-blue-300">Sign in to generate your referral link</p>
                <ConnectWalletButton variant="outline" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Rewards Card */}
        <Card className="bg-blue-800/50 border-blue-700 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-sky-400" />
              Daily Rewards
            </CardTitle>
            <CardDescription>Claim your daily PRAY tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-sky-600 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">+5</span>
            </div>
            <p className="text-sm text-blue-200">
              Come back every day to claim free PRAY tokens!
            </p>
            <Button onClick={handleClaimDailyReward} className="w-full">Claim Daily Reward</Button>
          </CardContent>
        </Card>

        {/* Staking Rewards Card */}
        <Card className="bg-blue-800/50 border-blue-700 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-emerald-400" />
              Staking Rewards
            </CardTitle>
            <CardDescription>Stake PRAY and earn passive income</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-200">
              Stake your PRAY tokens to earn rewards. The more you stake, the more you earn!
            </p>
            <p className="text-sm text-yellow-300">Coming soon! Staking will be available after token launch.</p>
            <Button disabled>Stake PRAY</Button>
          </CardContent>
        </Card>

        {/* Achievement Rewards Card */}
        <Card className="bg-blue-800/50 border-blue-700 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-400" />
              Achievement Rewards
            </CardTitle>
            <CardDescription>Complete tasks and earn rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-blue-100">Referral Milestone</h4>
              <p className="text-sm text-blue-200">Invite 3 friends to Praybit and unlock a special reward!</p>
              <Progress value={progress} />
              <p className="text-xs text-blue-300">{referralCount} / 3 Friends Invited</p>
            </div>

            {isEligible ? (
              <Button 
                onClick={handleClaimAchievement}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-medium"
              >
                Claim 50 PRAY Reward
              </Button>
            ) : (
              <Button variant="secondary" disabled={true}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Invite 3 Friends to Claim"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Card */}
        <Card className="bg-blue-800/50 border-blue-700 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
            <CardDescription>Top PRAY earners</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-200">See who's earning the most PRAY and compete for the top spot!</p>
            <ol className="list-decimal list-inside pl-4 mt-2 text-blue-300">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry: any, index) => (
                  <li key={entry.user_id} className={user && entry.user_id === user.id ? "text-yellow-300" : ""}>
                    User {index + 1} - {entry.coins} PRAY {user && entry.user_id === user.id ? "(You)" : ""}
                  </li>
                ))
              ) : (
                <>
                  <li>User 1 - 10000 PRAY</li>
                  <li>User 2 - 8000 PRAY</li>
                  <li>User 3 - 6000 PRAY</li>
                </>
              )}
              {user && !leaderboard.some((entry: any) => entry.user_id === user.id) && (
                <li className="text-yellow-300">You - {data.coins} PRAY</li>
              )}
            </ol>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">View Full Leaderboard</Button>
          </CardFooter>
        </Card>
      </div>

      <Stats 
        coins={data.coins || 0} 
        tapsCount={data.tapsCount || 0} 
        referrals={referralCount || 0} 
      />
    </AppLayout>
  );
};

export default Earn;
