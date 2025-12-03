# Day-Care System User Flows - Visual Diagrams

This document provides graphical representations of the main user flows in the day-care rotation system.

## Flow 1: Capacity Reduction - Child Loses Slot

```mermaid
flowchart TD
    Start([Staff Reduces Capacity]) --> CheckGroup{Is child's group<br/>still attending?}
    
    CheckGroup -->|Yes| NoChange[Child continues attending<br/>No status change]
    CheckGroup -->|No| LoseSlot[Child loses slot<br/>Group excluded]
    
    LoseSlot --> Notify[Parent sees notification:<br/>'Group not attending today']
    Notify --> ParentDecision{Does parent need<br/>day care slot?}
    
    ParentDecision -->|No| Accept[No action taken<br/>Status: NULL<br/>Child stays home]
    ParentDecision -->|Yes| ClickRequest[Parent clicks<br/>'Child needs slot']
    
    ClickRequest --> CheckCapacity{Is there available<br/>capacity?}
    
    CheckCapacity -->|Yes| ImmediateAssign[Immediate assignment<br/>Status: 'attending'<br/>Show in 'Additionally Attending']
    CheckCapacity -->|No| WaitingList[Add to waiting list<br/>Status: 'waiting_list'<br/>Show in 'Waiting List']
    
    WaitingList --> WaitingDecision{What happens next?}
    WaitingDecision -->|Another parent<br/>gives up slot| AutoAssign[Auto-assign from queue<br/>Status: 'waiting_list' → 'attending'<br/>Move to 'Additionally Attending']
    WaitingDecision -->|Parent removes<br/>from queue| RemoveWaiting[Remove from waiting list<br/>Status deleted<br/>Back to 'Group not attending']
    
    NoChange --> End([End])
    Accept --> End
    ImmediateAssign --> End
    AutoAssign --> End
    RemoveWaiting --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style LoseSlot fill:#ffebee
    style ImmediateAssign fill:#e8f5e9
    style WaitingList fill:#fff3e0
    style AutoAssign fill:#e8f5e9
```

## Flow 2: Capacity Increase - Automatic Reassignment

```mermaid
flowchart TD
    Start([Staff Increases Capacity]) --> Process[System processes<br/>waiting list automatically]
    
    Process --> CheckChildren{Check each child<br/>on waiting list}
    
    CheckChildren --> CheckOwnGroup{Is child's group<br/>now attending?}
    
    CheckOwnGroup -->|Yes| RestoreRegular[PRIORITY: Restore to regular slot<br/>Status deleted<br/>Child attends with own group]
    CheckOwnGroup -->|No| CheckGeneral{Is there general<br/>capacity available?}
    
    CheckGeneral -->|Yes| CheckFIFO{Is child first<br/>in FIFO queue?}
    CheckGeneral -->|No| StayWaiting[Remain on waiting list<br/>Status: 'waiting_list'<br/>Wait for next opening]
    
    CheckFIFO -->|Yes| AssignAdditional[Assign to additional slot<br/>Status: 'waiting_list' → 'attending'<br/>Show in 'Additionally Attending']
    CheckFIFO -->|No| StayWaiting
    
    RestoreRegular --> CheckMoreChildren{More children<br/>on waiting list?}
    AssignAdditional --> CheckMoreChildren
    StayWaiting --> CheckMoreChildren
    
    CheckMoreChildren -->|Yes| CheckChildren
    CheckMoreChildren -->|No| ProcessAdditional[Check 'additionally attending'<br/>children]
    
    ProcessAdditional --> CheckAdditional{Is additionally attending<br/>child's group now attending?}
    
    CheckAdditional -->|Yes| RestoreFromAdditional[Restore to regular slot<br/>Status deleted<br/>Remove from 'Additionally Attending']
    CheckAdditional -->|No| StayAdditional[Remain additionally attending<br/>Status: 'attending'<br/>No change needed]
    
    RestoreFromAdditional --> End([End])
    StayAdditional --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style RestoreRegular fill:#e8f5e9
    style AssignAdditional fill:#e8f5e9
    style RestoreFromAdditional fill:#e8f5e9
    style StayWaiting fill:#fff3e0
```

## Flow 3: Parent Gives Up Slot

```mermaid
flowchart TD
    Start([Parent clicks<br/>'Give up slot']) --> CheckSlotType{What type of<br/>slot does child have?}
    
    CheckSlotType -->|Regular slot<br/>Group attending| GiveUpRegular[Status: NULL → 'slot_given_up'<br/>Child gives up regular slot]
    CheckSlotType -->|Additional slot<br/>Status: 'attending'| GiveUpAdditional[Status: 'attending' → 'slot_given_up'<br/>Slot freed for others]
    
    GiveUpRegular --> ProcessQueue[System processes<br/>waiting list automatically]
    GiveUpAdditional --> ProcessQueue
    
    ProcessQueue --> CheckWaiting{Is anyone on<br/>waiting list?}
    
    CheckWaiting -->|Yes| AssignFirst[First child in FIFO queue<br/>Status: 'waiting_list' → 'attending'<br/>Move to 'Additionally Attending']
    CheckWaiting -->|No| NoAssignment[Capacity remains available<br/>No automatic assignment]
    
    AssignFirst --> UpdateDisplay[Update display:<br/>- Waiting list updated<br/>- Additionally attending updated<br/>- Capacity counter updated]
    NoAssignment --> UpdateDisplay
    
    UpdateDisplay --> End([End])
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style GiveUpRegular fill:#fff3e0
    style GiveUpAdditional fill:#fff3e0
    style AssignFirst fill:#e8f5e9
```

## Flow 4: Parent Re-Requests Slot After Giving Up

```mermaid
flowchart TD
    Start([Parent clicks<br/>'Request slot again']) --> CurrentStatus{What is current<br/>status?}
    
    CurrentStatus -->|'slot_given_up'| JoinQueue[Status: 'slot_given_up' → 'waiting_list'<br/>Join waiting list queue]
    CurrentStatus -->|NULL<br/>Group not attending| JoinQueue
    
    JoinQueue --> AutoProcess[System automatically processes<br/>waiting list immediately]
    
    AutoProcess --> CheckOwnGroup{Is child's group<br/>attending?}
    
    CheckOwnGroup -->|Yes| CheckGroupCapacity{Does own group<br/>have capacity?}
    CheckOwnGroup -->|No| CheckGeneralCapacity{Is there general<br/>capacity available?}
    
    CheckGroupCapacity -->|Yes| RestoreOwn[Restore to own group<br/>Status deleted<br/>IMPORTANT: Does NOT displace<br/>children with 'attending' status]
    CheckGroupCapacity -->|No| StayWaitingOwn[Own group full<br/>Status: 'waiting_list'<br/>Wait in queue]
    
    CheckGeneralCapacity -->|Yes| AssignAdditional[Assign to additional slot<br/>Status: 'waiting_list' → 'attending'<br/>Show in 'Additionally Attending']
    CheckGeneralCapacity -->|No| StayWaitingGeneral[No capacity anywhere<br/>Status: 'waiting_list'<br/>Remain in queue]
    
    RestoreOwn --> Success[Response: auto_assigned = true<br/>Frontend updates display]
    AssignAdditional --> Success
    StayWaitingOwn --> OnWaitingList[Response: status = 'waiting_list'<br/>Show in waiting list section]
    StayWaitingGeneral --> OnWaitingList
    
    Success --> End([End])
    OnWaitingList --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style RestoreOwn fill:#e8f5e9
    style AssignAdditional fill:#e8f5e9
    style StayWaitingOwn fill:#fff3e0
    style StayWaitingGeneral fill:#fff3e0
```

## Flow 5: Capacity Calculation Logic

```mermaid
flowchart TD
    Start([Calculate if child<br/>can be restored to own group]) --> GetGroup[Get child's assigned group]
    
    GetGroup --> CountOwn[Count children in group<br/>with NULL status or 'attending']
    
    CountOwn --> CountAdditional[Count children from OTHER groups<br/>with 'attending' status]
    
    CountAdditional --> Calculate[Total Capacity =<br/>Own group children +<br/>Additionally attending children]
    
    Calculate --> Compare{Total < 12?}
    
    Compare -->|Yes| CanRestore[Child can be restored<br/>Capacity available<br/>Status deleted]
    Compare -->|No| CannotRestore[Child CANNOT be restored<br/>Group at capacity<br/>Status: 'waiting_list']
    
    CannotRestore --> Important[CRITICAL: Children with<br/>'attending' status are NEVER<br/>displaced by returning children]
    
    CanRestore --> End([End])
    Important --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style CanRestore fill:#e8f5e9
    style CannotRestore fill:#ffebee
    style Important fill:#ffebee
    style Calculate fill:#fff9c4
```

## Flow 6: Staff Changes Rotation Order

```mermaid
flowchart TD
    Start([Staff changes<br/>rotation order]) --> UpdateOrder[Update group_order in DB<br/>Recalculate attending_groups<br/>based on capacity]
    
    UpdateOrder --> Process[Automatic processing triggered]
    
    Process --> CheckWaiting[Check all children<br/>on waiting list]
    
    CheckWaiting --> GroupNowAttending{Is child's group<br/>now in attending_groups?}
    
    GroupNowAttending -->|Yes| RestoreFromWaiting[PRIORITY: Restore to regular slot<br/>Status deleted<br/>Remove from waiting list]
    GroupNowAttending -->|No| CheckStillCapacity{Is there still<br/>general capacity?}
    
    CheckStillCapacity -->|Yes| StayAdditional[Can stay additionally attending<br/>Status unchanged]
    CheckStillCapacity -->|No| MayLoseSlot[May need to go to waiting list<br/>if capacity exhausted]
    
    RestoreFromWaiting --> CheckAdditional[Check all children<br/>with 'attending' status]
    StayAdditional --> CheckAdditional
    MayLoseSlot --> CheckAdditional
    
    CheckAdditional --> AdditionalGroupAttending{Is additionally attending<br/>child's group now attending?}
    
    AdditionalGroupAttending -->|Yes| RestoreFromAdditional[Restore to regular slot<br/>Status deleted<br/>Remove from 'Additionally Attending']
    AdditionalGroupAttending -->|No| CheckNewCapacity{Is there capacity<br/>in new attending groups?}
    
    CheckNewCapacity -->|Yes| StayAdditionalNew[Remain additionally attending<br/>Status: 'attending']
    CheckNewCapacity -->|No| MoveToWaiting[No capacity with new groups<br/>Status: 'attending' → 'waiting_list'<br/>Join waiting list]
    
    RestoreFromAdditional --> CheckAffected[Check children from<br/>newly excluded groups]
    StayAdditionalNew --> CheckAffected
    MoveToWaiting --> CheckAffected
    
    CheckAffected --> GroupExcluded{Was child's group<br/>excluded from new order?}
    
    GroupExcluded -->|Yes| NotifyLoss[Notify parent:<br/>'Group no longer attending'<br/>Child needs new slot]
    GroupExcluded -->|No| NoChange[No change needed<br/>Child continues attending]
    
    NotifyLoss --> End([End])
    NoChange --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style RestoreFromWaiting fill:#e8f5e9
    style RestoreFromAdditional fill:#e8f5e9
    style MoveToWaiting fill:#fff3e0
    style NotifyLoss fill:#ff0000
```

## Status State Diagram

```mermaid
stateDiagram-v2
    [*] --> NULL: Child's group attending<br/>(Default state)
    
    NULL --> slot_given_up: Parent gives up slot
    NULL --> waiting_list: Group excluded,<br/>parent requests slot,<br/>no capacity
    
    slot_given_up --> waiting_list: Parent requests<br/>slot again
    slot_given_up --> NULL: Group becomes available<br/>with capacity<br/>(auto-restore)
    
    waiting_list --> NULL: Own group becomes available<br/>with capacity<br/>(auto-restore - priority)
    waiting_list --> attending: Capacity available<br/>in other groups<br/>(auto-assign from queue)
    waiting_list --> [*]: Parent removes<br/>from waiting list<br/>(status deleted)
    
    attending --> NULL: Own group becomes available<br/>(auto-restore)
    attending --> slot_given_up: Parent gives up<br/>additional slot
    attending --> waiting_list: Capacity exhausted<br/>(rare - only if displaced)
    
    NULL --> [*]: System operates normally<br/>(no status entry needed)
    
    note right of NULL
        NULL = No entry in daily_attendance_status table
        Child attends with their own group by default
    end note
    
    note right of attending
        'attending' = Child is additionally attending
        Their group is NOT in attending_groups
        They have a slot in another group
    end note
    
    note right of waiting_list
        'waiting_list' = Child is in FIFO queue
        Waiting for capacity to open up
        Timestamp determines queue position
    end note
    
    note right of slot_given_up
        'slot_given_up' = Parent explicitly gave up slot
        Child will NOT auto-restore
        Must manually request slot again
    end note
```

## Key Principles Summary

```mermaid
mindmap
  root((Day-Care<br/>System<br/>Principles))
    Capacity Management
      12 children per group max
      Groups attend based on priority order
      Capacity slider: 0-4 groups
      Real-time capacity tracking
    Status States
      NULL: default attending
      attending: additionally attending
      waiting_list: in queue
      slot_given_up: parent's choice
    Priority Rules
      Own group restoration FIRST
      FIFO queue for general slots
      Children with 'attending' status<br/>CANNOT be displaced
      Giving up slot is permanent<br/>lose priority
    Automatic Processing
      Slot given up triggers queue
      Capacity change triggers restore
      Rotation change triggers reassign
      Immediate auto-assignment when possible
    Parent Actions
      Request slot
      Give up slot
      Remove from waiting list
      All actions explicit and intentional
```

---

## Notes

- **Green boxes** indicate successful slot assignment
- **Orange/Yellow boxes** indicate waiting or pending states
- **Red boxes** indicate slot loss or capacity issues
- **Blue boxes** indicate start/end points
- All flows are triggered either by **staff actions** (capacity/rotation changes) or **parent actions** (request/give up slot)
- The system is **reactive** - it processes automatically when triggered, but doesn't change state without a trigger
