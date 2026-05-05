import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, UserPlus, UserCheck, Clock, Trash2, Trophy, Check, X, Shuffle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchFriends, searchUsers, removeFriend,
  sendFriendRequest, fetchIncomingRequests, fetchOutgoingRequests,
  acceptFriendRequest, declineFriendRequest, fetchFriendSuggestions,
} from "../api/users";

export function FriendsScreen({ onClose, onVisit, onLeaderboard }) {
  const qc = useQueryClient();
  const [query, setQuery]         = useState("");
  const [debounced, setDebounced] = useState("");
  const [busyId, setBusyId]       = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  const { data: friends = [] }   = useQuery({ queryKey: ["friends"],         queryFn: fetchFriends,           staleTime: 30000 });
  const { data: incoming = [] }  = useQuery({ queryKey: ["frInbox"],         queryFn: fetchIncomingRequests,  staleTime: 30000 });
  const { data: outgoing = [] }  = useQuery({ queryKey: ["frOutbox"],        queryFn: fetchOutgoingRequests,  staleTime: 30000 });
  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ["search", debounced],
    queryFn:  () => searchUsers(debounced),
    enabled:  debounced.length > 0,
    staleTime: 10000,
  });
  // Random non-friend suggestions — refetched whenever the user opens the
  // screen so the strip feels lively, plus a Shuffle button for re-rolls.
  const { data: suggestions = [], refetch: reshuffleSuggestions, isFetching: suggesting } = useQuery({
    queryKey: ["friendSuggestions"],
    queryFn:  () => fetchFriendSuggestions(5),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const friendIds   = useMemo(() => new Set(friends.map(f => f.id)),         [friends]);
  const incomingMap = useMemo(() => new Map(incoming.map(r => [r.user.id, r])), [incoming]);
  const outgoingMap = useMemo(() => new Map(outgoing.map(r => [r.user.id, r])), [outgoing]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["friends"]  });
    qc.invalidateQueries({ queryKey: ["frInbox"]  });
    qc.invalidateQueries({ queryKey: ["frOutbox"] });
    // Refresh suggestions too — sending a request should remove that user
    // from the list (server-side filter), and accepting moves them to friends.
    qc.invalidateQueries({ queryKey: ["friendSuggestions"] });
  };

  const handleSend = async (user) => {
    if (busyId) return;
    setBusyId(user.id);
    try { await sendFriendRequest(user.id); invalidateAll(); }
    catch {/* ignore */} finally { setBusyId(null); }
  };

  const handleAccept = async (req) => {
    if (busyId) return;
    setBusyId("acc-" + req.id);
    try { await acceptFriendRequest(req.id); invalidateAll(); }
    catch {/* ignore */} finally { setBusyId(null); }
  };

  const handleDecline = async (req) => {
    if (busyId) return;
    setBusyId("dec-" + req.id);
    try { await declineFriendRequest(req.id); invalidateAll(); }
    catch {/* ignore */} finally { setBusyId(null); }
  };

  const handleRemove = async (user) => {
    if (busyId) return;
    setBusyId("rm-" + user.id);
    try { await removeFriend(user.id); invalidateAll(); }
    catch {/* ignore */} finally { setBusyId(null); }
  };

  // For each search result, decide what action button to show
  const actionFor = (user) => {
    if (friendIds.has(user.id)) {
      return <span className="friend-tag added"><UserCheck size={12} strokeWidth={2.5} /> Friend</span>;
    }
    const inbox = incomingMap.get(user.id);
    if (inbox) {
      return (
        <button className="friend-add-btn" onClick={() => handleAccept(inbox)} disabled={busyId === "acc-" + inbox.id}>
          <Check size={12} strokeWidth={2.5} /> Accept
        </button>
      );
    }
    if (outgoingMap.has(user.id)) {
      return <span className="friend-tag pending"><Clock size={12} strokeWidth={2.5} /> Requested</span>;
    }
    return (
      <button className="friend-add-btn" onClick={() => handleSend(user)} disabled={busyId === user.id}>
        {busyId === user.id ? "…" : <><UserPlus size={12} strokeWidth={2.5} /> Add</>}
      </button>
    );
  };

  return (
    <div className="friends-screen">
      <div className="friends-header">
        <button className="icon-btn" onClick={onClose}><ChevronLeft size={15} strokeWidth={2.5} /></button>
        <div className="sign" style={{ flex: 1, textAlign: "center" }}>
          <h1>👥 Friends</h1>
        </div>
        <button className="icon-btn" onClick={onLeaderboard} title="Leaderboard">
          <Trophy size={15} strokeWidth={2.5} />
        </button>
      </div>

      <div className="friends-searchbar">
        <Search size={14} strokeWidth={2.5} className="friends-search-icon" />
        <input
          className="friends-search"
          type="text"
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="friends-body">
        {/* ── Search results ── */}
        {debounced && (
          <section className="friends-section">
            <h3>{searching ? "Searching…" : `Results for "${debounced}"`}</h3>
            {!searching && results.length === 0 && (
              <div className="friends-empty"><span>🌾</span><p>No one found.</p></div>
            )}
            {results.map(u => (
              <FriendRow
                key={u.id} user={u}
                rightSlot={actionFor(u)}
                onClickName={() => friendIds.has(u.id) && onVisit(u)}
              />
            ))}
          </section>
        )}

        {/* ── Incoming requests (only when not searching) ── */}
        {!debounced && incoming.length > 0 && (
          <section className="friends-section">
            <h3>Friend Requests · {incoming.length}</h3>
            {incoming.map(req => (
              <FriendRow
                key={req.id} user={req.user}
                rightSlot={
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="friend-add-btn"
                      onClick={() => handleAccept(req)}
                      disabled={busyId === "acc-" + req.id}
                      title="Accept"
                    ><Check size={12} strokeWidth={2.5} /></button>
                    <button
                      className="friend-remove-btn"
                      onClick={() => handleDecline(req)}
                      disabled={busyId === "dec-" + req.id}
                      title="Decline"
                    ><X size={12} strokeWidth={2.5} /></button>
                  </div>
                }
              />
            ))}
          </section>
        )}

        {/* ── Suggested gardeners (random non-friends) ── */}
        {!debounced && suggestions.length > 0 && (
          <section className="friends-section">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>✨ Suggested gardeners</span>
              <button
                className="friend-shuffle"
                onClick={() => reshuffleSuggestions()}
                disabled={suggesting}
                title="Shuffle suggestions"
              >
                <Shuffle size={11} strokeWidth={2.5} />
              </button>
            </h3>
            {suggestions.map(u => (
              <FriendRow
                key={u.id} user={u}
                rightSlot={actionFor(u)}
                onClickName={() => friendIds.has(u.id) && onVisit(u)}
              />
            ))}
          </section>
        )}

        {/* ── My friends ── */}
        {!debounced && (
          <section className="friends-section">
            <h3>My Friends · {friends.length}</h3>
            {friends.length === 0 && (
              <div className="friends-empty"><span>🌱</span><p>No friends yet — search above to add some!</p></div>
            )}
            {friends.map(u => (
              <FriendRow
                key={u.id} user={u}
                rightSlot={
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="friend-visit-btn" onClick={() => onVisit(u)} title="Visit garden">🌸</button>
                    <button
                      className="friend-remove-btn"
                      onClick={() => handleRemove(u)}
                      disabled={busyId === "rm-" + u.id}
                      title="Remove friend"
                    ><Trash2 size={11} strokeWidth={2.5} /></button>
                  </div>
                }
                onClickName={() => onVisit(u)}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function FriendRow({ user, rightSlot, onClickName }) {
  return (
    <div className="friend-row">
      <button className="friend-avatar" style={{ background: user.avatarColor }} onClick={onClickName}>
        {user.initials}
      </button>
      <button className="friend-info" onClick={onClickName}>
        <div className="friend-name">{user.name}</div>
        <div className="friend-meta">🔥 {user.streak}d · 🌸 {user.harvestCount ?? 0} harvested</div>
      </button>
      {rightSlot}
    </div>
  );
}
